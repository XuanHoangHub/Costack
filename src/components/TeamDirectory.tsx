"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Workspace, Task } from '../types';
import { 
  Users, UserPlus, Shield, Sparkles, Mail, Circle,
  Key, Trash2, Globe, HeartHandshake, Compass, Upload,
  Check, ChevronDown, UserMinus, Plus, Info, LayoutGrid,
  Award, Activity, Star, Phone, Search, X, SlidersHorizontal,
  Briefcase, Calendar, CheckSquare, ClipboardList, Flame, Edit, 
  ExternalLink, UserCheck, Clock, GitBranch, ShieldAlert, CheckCircle2, AlertTriangle, MessageSquare, Megaphone, LayoutDashboard, PlugZap
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import SignedImage from './SignedImage';
import { useUiStore } from '../store/uiStore';
import InviteModal from './InviteModal';
import { setUserPresenceStatus } from '../hooks/useUserPresence';
import { renderSpaceIcon } from './EmojiIconPicker';
import { TeamCommandCenter, TeamIntegrations } from './team/TeamCommandCenter';
import TeamManagement from './team/TeamManagement';

interface TeamDirectoryProps {
  members: User[];
  tasks: Task[];
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onAddMember: (member: Omit<User, 'id'>) => void;
  onUpdateMember: (member: User) => void;
  onDeleteMember: (id: string) => void;
  onAddSyncLog: (action: string) => void;
  currentUser?: any;
  onSendWorkspaceInvites?: (emails: string[], role: string) => void;
  onStartChat?: (memberId: string) => void;
}

const DEPARTMENTS = [
  { id: 'd-hq', label: 'Executive Headquarters', icon: 'Building2' },
  { id: 'd-eng', label: 'Engineering & Technology', icon: 'Laptop' },
  { id: 'd-design', label: 'Design & Product Experience', icon: 'Palette' },
  { id: 'd-growth', label: 'Marketing & Sales Growth', icon: 'TrendingUp' },
];

const getDeptBadge = (deptId?: string) => {
  switch (deptId) {
    case 'd-hq': return { label: 'dept_hq_badge', icon: 'Building2', class: 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-455' };
    case 'd-eng': return { label: 'dept_eng_badge', icon: 'Laptop', class: 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-455' };
    case 'd-design': return { label: 'dept_design_badge', icon: 'Palette', class: 'bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-455' };
    case 'd-growth': return { label: 'dept_growth_badge', icon: 'TrendingUp', class: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-455' };
    default: return { label: 'General Member', icon: 'Zap', class: 'bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-400' };
  }
};

const maskEmail = (email?: string) => {
  if (!email || !email.includes('@')) return '••••••••@••••.com';
  const [user, domain] = email.split('@');
  const userMasked = user.length > 2 ? user.slice(0, 2) + '••••' : user + '••••';
  return `${userMasked}@${domain}`;
};

const maskPhone = (phone?: string) => {
  if (!phone) return '••••••••••';
  const clean = phone.trim();
  if (clean.length <= 4) return '••••' + clean;
  return '••••••••' + clean.slice(-3);
};

export default function TeamDirectory({
  members,
  tasks = [],
  workspaces,
  activeWorkspaceId,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddSyncLog,
  currentUser,
  onSendWorkspaceInvites,
  onStartChat
}: TeamDirectoryProps) {
  const { t, locale } = useTranslation();
  // Top-level Team OS sub-tab state
  const [teamOSView, setTeamOSView] = useState<'overview' | 'teams' | 'directory' | 'org_chart' | 'workload' | 'integrations'>('overview');
  
  // Presence is mounted once at app level; this action updates that shared connection.
  const setCustomStatus = setUserPresenceStatus;
  
  // Custom status popover state
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const me = members.find(m => m.id === 'user');
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const isOwner = currentUser?.role === 'admin'
    || me?.role === 'admin'
    || activeWorkspace?.membershipRole === 'owner'
    || activeWorkspace?.membershipRole === 'admin'
    || activeWorkspace?.user_id === currentUser?.id
    || activeWorkspace?.user_id === me?.id;
  const [statusVal, setStatusVal] = useState<'online' | 'busy' | 'away' | 'offline'>(me?.customStatus || 'online');
  const [statusMsg, setStatusMsg] = useState(me?.statusMessage || '');
  const [statusEmj, setStatusEmj] = useState(me?.statusEmoji || '');

  // DB Hierarchical Team OS states
  const [dbDepts, setDbDepts] = useState<any[]>([]);
  const [dbTeams, setDbTeams] = useState<any[]>([]);
  const [dbTeamMembers, setDbTeamMembers] = useState<any[]>([]);
  const [activeAnnouncementTeam, setActiveAnnouncementTeam] = useState<any | null>(null);
  const [newAnnouncementText, setNewAnnouncementText] = useState('');

  // Keep state in sync when 'me' changes
  useEffect(() => {
    if (me) {
      setStatusVal(me.customStatus || 'online');
      setStatusMsg(me.statusMessage || '');
      setStatusEmj(me.statusEmoji || '');
    }
  }, [me]);

  // Fetch db teams and depts hierarchy
  const fetchHierarchy = useCallback(async () => {
    try {
      const { data: depts } = await supabase.from('departments').select('*');
      const { data: tms } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('created_at', { ascending: true });
      const teamIds = (tms || []).map(team => team.id);
      const { data: membersMap } = teamIds.length
        ? await supabase.from('team_members').select('*').in('team_id', teamIds)
        : { data: [] };
      
      if (depts) setDbDepts(depts);
      if (tms) setDbTeams(tms);
      if (membersMap) setDbTeamMembers(membersMap);
    } catch (e) {
      console.warn('Hierarchy fetch failed:', e);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  // Relative time helper
  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Offline';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (isNaN(diffMs) || diffMs < 0) return 'Active recently';
      
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Active just now';
      if (diffMins < 60) return `Active ${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Active ${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Active yesterday';
      return `Active ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    } catch (e) {
      return 'Offline';
    }
  };

  const [activeTab, setActiveTab] = useState<'workspace' | 'all'>('workspace');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddExistingDropdown, setShowAddExistingDropdown] = useState(false);
  
  // Search and Advanced Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');

  // Member detail view modal state
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'overview' | 'settings'>('overview');

  // Member detailed editing form inside details panel
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [editBio, setEditBio] = useState('');

  const currentWorkspaceName = workspaces.find(w => w.id === activeWorkspaceId)?.name || 'Current Workspace';

  // Open detailing modal helper
  const handleOpenDetail = (member: User) => {
    setSelectedMember(member);
    setDetailActiveTab('overview');
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhone(member.phone || '');
    setEditDepartment(member.department || 'd-eng');
    setEditRole(member.role);
    setEditBio(member.bio || '');
  };

  const handleUpdateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    const updatedUser: User = {
      ...selectedMember,
      name: editName,
      email: editEmail,
      phone: editPhone,
      department: editDepartment,
      role: editRole,
      bio: editBio
    };

    onUpdateMember(updatedUser);
    onAddSyncLog(`Updated member profile details: ${editName}`);
    setSelectedMember(updatedUser); // Update local active item
    
    // Quick notification beep if enabled
    (window as any).playSystemSound?.('success');
  };

  // Statistics calculation for the active workspace
  const workspaceMembers = members.filter(m => m.workspaceIds?.includes(activeWorkspaceId));
  const totalWorkspaceCount = workspaceMembers.length;
  const onlineWorkspaceCount = workspaceMembers.filter(m => m.status === 'online').length;
  const busyWorkspaceCount = workspaceMembers.filter(m => m.status === 'busy').length;

  const statusColors = {
    online: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-950/40',
    busy: 'bg-rose-500 ring-rose-100 dark:ring-rose-950/40',
    away: 'bg-amber-500 ring-amber-100 dark:ring-amber-950/40',
    offline: 'bg-slate-400 ring-slate-100 dark:ring-slate-900/40'
  };

  const statusLabelsEng = {
    online: t('online') || 'Online',
    busy: t('busy') || 'Busy / DND',
    away: locale === 'vi' ? 'Vắng mặt' : 'Away',
    offline: t('offline') || 'Offline'
  };

  const roleLabels = {
    admin: { text: t('roleAdmin') || 'Admin', bg: 'bg-indigo-50 border-indigo-200/50 text-indigo-700 dark:bg-indigo-950/35 dark:border-indigo-900/40 dark:text-indigo-400' },
    member: { text: t('roleMember') || 'Member', bg: 'bg-cyan-50 border-cyan-200/50 text-cyan-700 dark:bg-cyan-950/35 dark:border-cyan-900/40 dark:text-cyan-400' },
    guest: { text: locale === 'vi' ? 'Khách / Đối tác' : 'Guest / Partner', bg: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400' }
  };

  // Find users in the organization not yet in this active workspace
  const membersAvailableToEnroll = members.filter(m => !m.workspaceIds?.includes(activeWorkspaceId));

  const handleEnrollExisting = (member: User) => {
    const updatedIds = [...(member.workspaceIds || []), activeWorkspaceId];
    onUpdateMember({
      ...member,
      workspaceIds: updatedIds
    });
    onAddSyncLog(`Appointed member "${member.name}" to workspace "${currentWorkspaceName}"`);
    setShowAddExistingDropdown(false);
  };

  const handleRemoveFromWorkspace = (member: User) => {
    if (member.id === 'user') return;
    
    const updatedIds = (member.workspaceIds || []).filter(id => id !== activeWorkspaceId);
    onUpdateMember({
      ...member,
      workspaceIds: updatedIds
    });
    onAddSyncLog(`Removed member "${member.name}" from workspace "${currentWorkspaceName}"`);
    
    if (selectedMember?.id === member.id) {
      setSelectedMember(null);
    }
  };

  const handleAvatarUpload = async (member: User, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const uuid = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${session.user.id}/members/${member.id}/${uuid}.${ext}`;

      onAddSyncLog(`Saving avatar update for ${member.name}...`);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        onAddSyncLog(`Error occurred while saving avatar for ${member.name}`);
        return;
      }

      if (member.avatar && !member.avatar.startsWith('http')) {
        await supabase.storage.from('avatars').remove([member.avatar]);
      }

      const updatedUser = {
        ...member,
        avatar: filePath
      };

      onUpdateMember(updatedUser);

      if (selectedMember?.id === member.id) {
        setSelectedMember(updatedUser);
      }

      onAddSyncLog(`Avatar updated successfully for ${member.name}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendInvites = (emails: string[], role: string) => {
    if (onSendWorkspaceInvites) {
      onSendWorkspaceInvites(emails, role);
      setShowInviteModal(false);
      return;
    }

    const formattedJoinedDate = new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });

    emails.forEach(email => {
      const baseName = email.split('@')[0];
      const name = baseName
        .split(/[._\-+]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      let finalRole: 'admin' | 'member' | 'guest' = 'member';
      if (role === 'admin') {
        finalRole = 'admin';
      } else if (role === 'guest' || role === 'limited') {
        finalRole = 'guest';
      }

      onAddMember({
        name,
        email,
        phone: '',
        department: 'd-eng',
        bio: 'No biography updated yet.',
        joinedDate: formattedJoinedDate,
        avatar: '',
        role: finalRole,
        status: 'offline',
        workspaceIds: [activeWorkspaceId]
      });
    });
  };

  const displayMembers = activeTab === 'workspace' ? workspaceMembers : members;

  // Filter implementation
  const filteredMembers = displayMembers.filter(m => {
    const query = searchQuery.toLowerCase().trim();
    const deptInfo = getDeptBadge(m.department);
    const matchesSearch = !query || 
      m.name.toLowerCase().includes(query) || 
      m.email.toLowerCase().includes(query) || 
      (m.phone && m.phone.toLowerCase().includes(query)) ||
      t(deptInfo.label).toLowerCase().includes(query) ||
      (m.bio && m.bio.toLowerCase().includes(query));

    const matchesRole = filterRole === 'all' || m.role === filterRole;
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    const matchesDept = filterDept === 'all' || m.department === filterDept;

    return matchesSearch && matchesRole && matchesStatus && matchesDept;
  });

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterRole('all');
    setFilterStatus('all');
    setFilterDept('all');
  };

  // POST Announcement to a Team
  const handlePostAnnouncement = async () => {
    if (!activeAnnouncementTeam || !newAnnouncementText.trim()) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({ announcement: newAnnouncementText.trim() })
        .eq('id', activeAnnouncementTeam.id);

      if (!error) {
        setDbTeams(prev => prev.map(t => t.id === activeAnnouncementTeam.id ? { ...t, announcement: newAnnouncementText.trim() } : t));
        onAddSyncLog(`Posted new announcement for team: ${activeAnnouncementTeam.name}`);
        setNewAnnouncementText('');
        setActiveAnnouncementTeam(null);
        (window as any).playSystemSound?.('success');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Board Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.01)] transition-all">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display text-slate-850 dark:text-slate-50 tracking-tight flex items-center gap-2">
                {locale === 'vi' ? 'Không gian điều hành đội nhóm' : 'Team OS Workspace Manager'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-550 font-medium leading-relaxed max-w-2xl text-left">
                {locale === 'vi'
                  ? 'Quản lý con người, cơ cấu tổ chức, năng lực, tiến độ và các kết nối của đội nhóm trong một không gian thống nhất.'
                  : 'Manage people, structure, capacity, delivery and team connections in one unified workspace.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick enroll button */}
          {activeTab === 'workspace' && membersAvailableToEnroll.length > 0 && (
            <div className="relative">
              <button
                id="btn_enroll_existing"
                onClick={() => setShowAddExistingDropdown(!showAddExistingDropdown)}
                className="py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-855 dark:hover:bg-slate-800 dark:text-slate-200 border border-slate-250 dark:border-slate-800/80 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none"
              >
                <Plus className="w-4 h-4 text-slate-500" />
                <span>{locale === 'vi' ? 'Phân công nhân sự' : 'Assign Staff'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <AnimatePresence>
                {showAddExistingDropdown && (
                  <>
                    <div className="fixed inset-0 z-20 cursor-default" onClick={() => setShowAddExistingDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-2 overflow-hidden"
                    >
                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                      Select staff to assign to {currentWorkspaceName}
                    </div>
                    <div className="max-h-52 overflow-y-auto custom-scrollbar p-1 space-y-1 mt-1">
                      {membersAvailableToEnroll.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleEnrollExisting(m)}
                          className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-805 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <SignedImage 
                            filePath={m.avatar} 
                            className="w-7 h-7 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                            alt={m.name}
                          />
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{m.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            id="btn_open_invite_member"
            onClick={() => {
              (window as any).playSystemSound?.('click');
              setShowInviteModal(true);
            }}
            className="py-2.5 px-4 bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-650 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer self-start lg:self-auto hover:shadow-indigo-500/10"
          >
            <UserPlus className="w-4 h-4" />
            <span>{locale === 'vi' ? 'Thêm / Mời thành viên' : 'Add / Invite Staff'}</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Selector for Team OS Views */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-t-2xl p-1 scrollbar-none">
        {[
          { id: 'overview', label: locale === 'vi' ? 'Tổng quan' : 'Overview', icon: LayoutDashboard },
          { id: 'teams', label: 'Teams', icon: Users },
          { id: 'directory', label: locale === 'vi' ? 'Danh bạ' : 'Staff Directory', icon: LayoutGrid },
          { id: 'org_chart', label: locale === 'vi' ? 'Tổ chức & Nhóm' : 'Organization & Teams', icon: GitBranch },
          { id: 'workload', label: locale === 'vi' ? 'Workload & Năng lực' : 'Workload & Capacity', icon: ClipboardList },
          { id: 'integrations', label: locale === 'vi' ? 'Kết nối' : 'Integrations', icon: PlugZap }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setTeamOSView(tab.id as any);
              (window as any).playSystemSound?.('click');
            }}
            className={`min-w-36 flex-1 py-3 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              teamOSView === tab.id
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 shadow-3xs'
                : 'text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT 0: TEAM COMMAND CENTER */}
      {teamOSView === 'overview' && (
        <TeamCommandCenter
          members={members}
          tasks={tasks}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onInvite={() => setShowInviteModal(true)}
          onOpenDirectory={() => setTeamOSView('directory')}
          onOpenWorkload={() => setTeamOSView('workload')}
          onStartChat={onStartChat}
        />
      )}

      {/* TAB CONTENT 1: TEAM MANAGEMENT */}
      {teamOSView === 'teams' && (
        <TeamManagement
          teams={dbTeams}
          memberships={dbTeamMembers}
          members={members}
          tasks={tasks}
          activeWorkspaceId={activeWorkspaceId}
          canManage={Boolean(isOwner)}
          onTeamsChange={setDbTeams}
          onMembershipsChange={setDbTeamMembers}
          onAddSyncLog={onAddSyncLog}
        />
      )}

      {/* TAB CONTENT 2: STAFF DIRECTORY */}
      {teamOSView === 'directory' && (
        <div className="space-y-6">
          {/* My Status Selector Card */}
          {me && (
            <div className="relative p-5 bg-indigo-500/5 dark:bg-indigo-950/10 border border-indigo-500/20 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <SignedImage
                    filePath={me.avatar}
                    className="w-12 h-12 rounded-full border-2 border-indigo-500/30 object-cover shrink-0 select-none bg-slate-50 dark:bg-slate-900"
                    alt={me.name}
                  />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${statusColors[me.status as keyof typeof statusColors]} shrink-0 shadow-xs`} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-855 dark:text-slate-55">My Availability Status</span>
                    <span className="text-[10px] font-black bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {statusLabelsEng[me.status as keyof typeof statusLabelsEng]}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    {me.statusEmoji ? <span className="text-sm">{me.statusEmoji}</span> : null}
                    <span className={me.statusMessage ? "italic text-slate-700 dark:text-slate-300 font-medium" : "text-slate-400 italic"}>
                      {me.statusMessage ? `"${me.statusMessage}"` : "No status message set. Click customize to add one."}
                    </span>
                  </p>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowStatusPopover(!showStatusPopover)}
                  className="py-2 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer select-none"
                >
                  <span>Customize Status</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Status Customization Dropdown Popover */}
                <AnimatePresence>
                  {showStatusPopover && (
                    <>
                      <div className="fixed inset-0 z-30 cursor-default" onClick={() => setShowStatusPopover(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-40 p-4 space-y-4"
                      >
                        <div className="text-xs font-black text-slate-855 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-left">
                          Set availability & status
                        </div>

                        {/* Status radio choices */}
                        <div className="space-y-2 text-left">
                          <label className="text-[10px] font-black uppercase text-slate-400">Availability</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'online', label: 'Online', color: 'bg-emerald-500' },
                              { id: 'away', label: 'Away', color: 'bg-amber-500' },
                              { id: 'busy', label: 'Busy (DND)', color: 'bg-rose-500' },
                              { id: 'offline', label: 'Offline', color: 'bg-slate-400' }
                            ].map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setStatusVal(opt.id as any)}
                                className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                                  statusVal === opt.id
                                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-650 dark:text-indigo-400 dark:bg-indigo-950/20'
                                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-805 text-slate-605 dark:text-slate-300'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                                <span>{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom message input */}
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-black uppercase text-slate-400 font-sans">Status Message</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={3}
                              value={statusEmj}
                              onChange={(e) => setStatusEmj(e.target.value)}
                              placeholder="Available"
                              className="w-10 px-2 py-2 text-center text-sm rounded-xl border border-slate-250 dark:border-slate-808 bg-white dark:bg-slate-900 outline-none text-slate-800 dark:text-slate-100 font-semibold"
                            />
                            <input
                              type="text"
                              maxLength={100}
                              value={statusMsg}
                              onChange={(e) => setStatusMsg(e.target.value)}
                              placeholder="What is your status?"
                              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-slate-808 bg-white dark:bg-slate-900 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-405 font-semibold focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Save action button */}
                        <div className="pt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowStatusPopover(false)}
                            className="flex-1 py-2 bg-slate-55 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await setCustomStatus(statusVal, statusMsg, statusEmj);
                              setShowStatusPopover(false);
                            }}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-705 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                          >
                            Save Status
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Bento-style Workspace Analytics Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-xs flex items-center justify-between transition-colors">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Workspace Staff Scale
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-850 dark:text-slate-50 tracking-tight">
                    {totalWorkspaceCount} <span className="text-xs font-bold text-slate-500">staff</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  In workspace: <span className="font-bold text-slate-700 dark:text-slate-300">{currentWorkspaceName}</span>
                </p>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-550 dark:text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-xs flex items-center justify-between transition-colors">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Online Activity Rate
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-850 dark:text-slate-50 tracking-tight flex items-center gap-1.5">
                    {onlineWorkspaceCount} <span className="text-xs font-bold text-slate-500">Online</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping"></span>
                  <span>{busyWorkspaceCount} busy in meetings/tasks</span>
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-555 dark:text-emerald-400 font-black">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-xs flex items-center justify-between transition-colors">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Total Org Footprint
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-850 dark:text-slate-50 tracking-tight">
                    {members.length} <span className="text-xs font-bold text-slate-500">total members</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Leveraging performance across {workspaces.length} connected spaces
                </p>
              </div>
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl text-cyan-555 dark:text-cyan-400 font-black">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Tabs Filter Selector Row (Workspace vs Global) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-2">
            <div className="flex items-center gap-1 pb-px">
              <button
                onClick={() => {
                  setActiveTab('workspace');
                  setShowAddExistingDropdown(false);
                }}
                className={`py-3 px-4 text-xs font-bold transition-all relative cursor-pointer select-none flex items-center gap-1.5 ${
                  activeTab === 'workspace' 
                    ? 'text-indigo-650 dark:text-indigo-400 border-b-2 border-indigo-605 dark:border-indigo-400 font-black' 
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-550 dark:hover:text-slate-350'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Members in {currentWorkspaceName} ({totalWorkspaceCount})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('all');
                  setShowAddExistingDropdown(false);
                }}
                className={`py-3 px-4 text-xs font-bold transition-all relative cursor-pointer select-none flex items-center gap-1.5 ${
                  activeTab === 'all' 
                    ? 'text-indigo-655 dark:text-indigo-400 border-b-2 border-indigo-605 dark:border-indigo-400 font-black' 
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-550 dark:hover:text-slate-350'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>All Org Directory ({members.length})</span>
              </button>
            </div>

            <div className="text-[11px] px-3 pb-2 sm:pb-0 text-slate-400 dark:text-slate-550 font-bold italic">
              Showing {filteredMembers.length} matching colleagues
            </div>
          </div>

          {/* 🔍 SEARCH AND ADVANCED FILTERS */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                id="team_search_input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, department, phone, biography..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-250 dark:border-slate-800 bg-white hover:bg-slate-50 focus:bg-white dark:bg-slate-900 dark:hover:bg-slate-850 dark:hover:border-slate-700 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all font-semibold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold outline-none cursor-pointer focus:border-indigo-550"
              >
                <option value="all">{t('allDepartments') || 'All departments'}</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{t('dept_' + d.id + '_name') || d.label}</option>
                ))}
              </select>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold outline-none cursor-pointer focus:border-indigo-550"
              >
                <option value="all">{t('allRoles') || 'All roles'}</option>
                <option value="admin">{t('roleAdminLabel') || 'Admin'}</option>
                <option value="member">{t('roleMemberLabel') || 'Member'}</option>
                <option value="guest">{t('roleGuestLabel') || 'Guest'}</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold outline-none cursor-pointer focus:border-indigo-550"
              >
                <option value="all">{t('allStatuses') || 'All statuses'}</option>
                <option value="online">{t('online') || 'Online'}</option>
                <option value="away">{locale === 'vi' ? 'Vắng mặt' : 'Away'}</option>
                <option value="busy">{t('busy') || 'Busy / DND'}</option>
                <option value="offline">{t('offline') || 'Offline'}</option>
              </select>

              {(searchQuery || filterRole !== 'all' || filterStatus !== 'all' || filterDept !== 'all') && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/5 rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                >
                  {t('clearFilters') || 'Reset'}
                </button>
              )}
            </div>
          </div>

          {/* Members Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMembers.map((member) => {
              const memberTasks = tasks.filter(t => t.assigneeId === member.id || t.assigneeIds?.includes(member.id));
              const totalTaskCount = memberTasks.length;
              const completedTaskCount = memberTasks.filter(t => t.status === 'completed').length;
              const pendingTaskCount = totalTaskCount - completedTaskCount;
              const completionPercent = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;
              const deptBadge = getDeptBadge(member.department);
              const isCurrentUser = member.id === 'user';

              return (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="group relative p-5.5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/65 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.06)] dark:hover:shadow-[0_20px_50px_rgba(99,102,241,0.12)] hover:border-indigo-500/25 dark:hover:border-indigo-400/25 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
                >
                  <div className="absolute -inset-px bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div className="space-y-4 relative z-10">
                    
                    {/* Status Pill & Role Badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider select-none shadow-3xs ${roleLabels[member.role].bg}`}>
                          {roleLabels[member.role].text}
                        </span>
                        <div
                          className="mt-2 p-1 px-2.5 bg-slate-50/80 dark:bg-slate-850 rounded-full border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 shadow-3xs select-none"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${statusColors[member.status as 'online' | 'busy' | 'away' | 'offline']} shrink-0 shadow-xs`} />
                          <span className="text-[10px] text-slate-550 dark:text-slate-400 font-bold whitespace-nowrap">
                            {statusLabelsEng[member.status as 'online' | 'busy' | 'away' | 'offline']}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Member Core Info (Avatar, Name, Email) */}
                    <div className="flex items-center gap-3.5 pt-1.5">
                      <div className="relative group/avatar cursor-pointer">
                        <SignedImage 
                          filePath={member.avatar} 
                          className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-850 border-2 border-slate-200 dark:border-slate-800 group-hover/avatar:border-indigo-500/40 p-0.5 object-cover shrink-0 select-none group-hover/avatar:brightness-90 transition-all duration-300 ring-4 ring-indigo-500/0 group-hover/avatar:ring-indigo-500/10" 
                          alt={member.name} 
                        />
                        <label className="absolute inset-x-0 bottom-0 bg-black/60 rounded-b-full py-0.5 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity">
                          <span className="text-[8px] text-white font-extrabold select-none scale-90">EDIT PHOTO</span>
                          <input 
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleAvatarUpload(member, e)}
                          />
                        </label>
                      </div>
                      <div className="min-w-0 text-left" onClick={() => handleOpenDetail(member)}>
                        <h4 className="font-extrabold text-slate-850 dark:text-slate-50 text-sm leading-snug truncate group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1">
                          <span>{member.name}</span>
                        </h4>
                        {(() => {
                          const canViewSensitiveInfo = currentUser?.role === 'admin' || member.id === 'user' || member.id === currentUser?.id || member.email === currentUser?.email;
                          return (
                            <>
                              <span className="text-[10px] text-slate-405 dark:text-slate-500 font-semibold block truncate leading-relaxed">
                                {canViewSensitiveInfo ? member.email : maskEmail(member.email)}
                              </span>
                              {member.phone && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-450 block truncate font-medium mt-px">
                                  {canViewSensitiveInfo ? member.phone : maskPhone(member.phone)}
                                </span>
                              )}
                            </>
                          );
                        })()}
                        {member.statusMessage && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-1.5 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/40 pt-1">
                            {member.statusEmoji ? <span className="text-xs">{member.statusEmoji}</span> : null}
                            <span className="italic">"{member.statusMessage}"</span>
                          </span>
                        )}
                        {member.status === 'offline' && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-550 font-semibold flex items-center gap-1 mt-1 leading-none">
                            <Clock className="w-3 h-3 text-slate-350 dark:text-slate-600" />
                            <span>{formatLastSeen(member.lastSeenAt)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Department badge indicator */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550">{t('department') || 'Department'}:</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-3xs ${deptBadge.class}`}>
                        {renderSpaceIcon(deptBadge.icon, "w-3 h-3")}
                        <span>{t(deptBadge.label) || deptBadge.label}</span>
                      </span>
                    </div>

                    {/* Task workload meter */}
                    <div className="bg-slate-50/40 dark:bg-slate-950/30 p-3 border border-slate-200/35 dark:border-slate-800/40 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400 dark:text-slate-550 block font-sans">Task Progress</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{completedTaskCount}/{totalTaskCount} tasks</span>
                      </div>
                      
                      {totalTaskCount > 0 ? (
                        <div className="space-y-1.5">
                          <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-2 rounded-full overflow-hidden p-0.5">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.2)]" 
                              style={{ width: `${completionPercent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-555 font-semibold">
                            <span>Completed: {completionPercent}%</span>
                            <span className="text-amber-600 dark:text-amber-455 font-bold">{pendingTaskCount} pending</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 dark:text-slate-555 italic font-medium py-0.5 text-center">
                          No tasks assigned
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between relative z-10">
                    <span className="text-[10px] text-slate-400 font-medium">Joined {member.joinedDate || '2026'}</span>
                    
                    <div className="flex items-center gap-1.5">
                      {!isCurrentUser && onStartChat && (
                        <button
                          onClick={() => onStartChat(member.id)}
                          className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white border border-indigo-200/50 dark:border-indigo-800/50 text-[10.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                          title="Nhắn tin trực tiếp"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Nhắn tin</span>
                        </button>
                      )}
                      {!isCurrentUser && activeTab === 'workspace' && (
                        <button
                          onClick={() => handleRemoveFromWorkspace(member)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          title="Dismiss from Workspace"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div className="p-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/20">
              <Users className="w-10 h-10 mx-auto text-slate-350 dark:text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No colleagues matching filter criteria</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">Adjust search keys or resets filters to view organization catalog.</p>
              <button
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: ORGANIZATIONAL TREE CHART */}
      {teamOSView === 'org_chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
          {/* Main Org Tree Canvas area */}
          <div className="lg:col-span-3 p-6 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl space-y-8 overflow-x-auto min-h-[500px] flex flex-col items-center justify-start">
            
            {/* Visual Header */}
            <div className="w-full border-b border-slate-200/50 dark:border-slate-800/60 pb-4 text-center">
              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Apexa Corporate Hierarchy</span>
              <h3 className="text-base font-black text-slate-850 dark:text-slate-100 mt-0.5">Dynamic Organizational Flow</h3>
            </div>

            {/* Tree Nodes Renderer */}
            <div className="space-y-12 w-full max-w-3xl flex flex-col items-center">
              {/* Root node - HQ */}
              {dbDepts.filter(d => !d.parent_id).map(hq => {
                const manager = members.find(m => m.id === hq.manager_id || (m.id === 'user' && hq.manager_id?.includes('user')));
                return (
                  <div key={hq.id} className="flex flex-col items-center space-y-8 w-full">
                    {/* HQ Node Box */}
                    <div className="relative p-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl shadow-xl w-64 text-center border border-indigo-400/20 hover:scale-105 transition-all duration-300">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white text-indigo-750 text-[8px] font-black uppercase tracking-wider rounded-md shadow-sm border border-indigo-50 select-none">
                        {locale === 'vi' ? 'Văn phòng Cao nhất' : 'Top Office'}
                      </div>
                      <h4 className="text-sm font-black tracking-tight">{t('dept_' + hq.id + '_name') || hq.name}</h4>
                      <p className="text-[10px] text-indigo-100 font-medium mt-1 leading-relaxed">{t('dept_' + hq.id + '_desc') || hq.description}</p>
                      
                      {/* Leader profile block */}
                      {manager && (
                        <div className="mt-3.5 pt-3 border-t border-white/20 flex items-center gap-2 text-left justify-start">
                          <SignedImage 
                            filePath={manager.avatar} 
                            className="w-7 h-7 rounded-full bg-white/10 p-0.5 object-cover" 
                            alt={manager.name} 
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black leading-none truncate">{manager.name}</p>
                            <span className="text-[8px] text-indigo-150 uppercase tracking-widest font-black block mt-0.5">{locale === 'vi' ? 'Giám đốc Điều hành' : 'HQ Director'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hierarchy Line Spacer */}
                    <div className="w-0.5 h-10 bg-slate-300 dark:bg-slate-800 relative">
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900" />
                    </div>

                    {/* Level 2: Child Departments Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full relative">
                      
                      {dbDepts.filter(d => d.parent_id === hq.id).map(dept => {
                        const deptManager = members.find(m => m.id === dept.manager_id || (m.id === 'user' && dept.manager_id?.includes('user')));
                        const deptTeams = dbTeams.filter(t => t.department_id === dept.id);

                        return (
                          <div key={dept.id} className="flex flex-col items-center space-y-6">
                            {/* Department Box */}
                            <div className="p-4 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-md w-56 text-center hover:border-indigo-500/40 dark:hover:border-indigo-400/40 transition-all duration-300">
                              <div className="flex justify-center mb-1">{renderSpaceIcon(getDeptBadge(dept.id).icon, "w-4 h-4 text-indigo-500")}</div>
                              <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">{t('dept_' + dept.id + '_name') || dept.name}</h5>
                              
                              {deptManager && (
                                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 justify-start text-left">
                                  <SignedImage 
                                    filePath={deptManager.avatar} 
                                    className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-900 border object-cover" 
                                    alt={deptManager.name} 
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-none truncate">{deptManager.name}</p>
                                    <span className="text-[8px] text-slate-400 font-medium block mt-px">{locale === 'vi' ? 'Trưởng phòng' : 'Dept Lead'}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Line connecting to teams */}
                            <div className="w-0.5 h-6 bg-slate-205 dark:bg-slate-805" />

                            {/* Teams under this Department */}
                            <div className="space-y-4 w-full flex flex-col items-center">
                              {deptTeams.map(team => {
                                const teamLeader = members.find(m => m.id === team.leader_id || (m.id === 'user' && team.leader_id?.includes('user')));
                                const memberCount = dbTeamMembers.filter(tm => tm.team_id === team.id).length;

                                return (
                                  <div 
                                    key={team.id}
                                    onClick={() => {
                                      setActiveAnnouncementTeam(team);
                                      setNewAnnouncementText(team.announcement || '');
                                      (window as any).playSystemSound?.('click');
                                    }}
                                    className="p-3 bg-slate-50/50 hover:bg-white dark:bg-slate-900/40 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-2xs w-48 text-left cursor-pointer hover:border-indigo-500/25 dark:hover:border-indigo-400/25 transition-all"
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <h6 className="text-[11px] font-black text-slate-805 dark:text-slate-200 leading-tight truncate">{t('team_' + team.id + '_name') || team.name}</h6>
                                      <span className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-455 rounded-md shrink-0">
                                        {t('memberCount').replace('{count}', String(memberCount))}
                                      </span>
                                    </div>
                                    
                                    {teamLeader && (
                                      <div className="mt-2.5 flex items-center gap-1.5">
                                        <SignedImage 
                                          filePath={teamLeader.avatar} 
                                          className="w-5 h-5 rounded-full object-cover bg-slate-200 dark:bg-slate-800" 
                                          alt={teamLeader.name} 
                                        />
                                        <span className="text-[9px] text-slate-550 dark:text-slate-400 font-bold truncate leading-none">{teamLeader.name}</span>
                                      </div>
                                    )}

                                    {team.announcement && (
                                      <div className="mt-2 text-[9px] bg-amber-500/5 border border-amber-500/10 p-1 px-1.5 rounded text-amber-700 dark:text-amber-400 font-medium truncate flex items-center gap-1">
                                        <Megaphone className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                        <span>{team.announcement}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Announcements Dashboard */}
          <div className="space-y-5">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl space-y-4">
              <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wider">
                <Megaphone className="w-4 h-4 text-amber-500" />
                <span>{t('teamBroadcasts') || 'Team Broadcasts'}</span>
              </h4>

              {activeAnnouncementTeam ? (
                <div className="space-y-3.5 text-left font-sans text-xs">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">{t('selectedTeam') || 'Selected Team'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block mt-0.5">{t('team_' + activeAnnouncementTeam.id + '_name') || activeAnnouncementTeam.name}</span>
                  </div>

                  {isOwner ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 block">{t('broadcastMessage') || 'Broadcast Message'}</label>
                        <textarea
                          rows={3}
                          value={newAnnouncementText}
                          onChange={(e) => setNewAnnouncementText(e.target.value)}
                          placeholder={t('writeBroadcastPlaceholder') || 'Write team broadcast notice (e.g. Schedule changes)...'}
                          className="w-full p-2.5 text-xs rounded-xl border border-slate-250 dark:border-slate-855 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-550 font-semibold"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveAnnouncementTeam(null)}
                          className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl font-bold transition-all cursor-pointer"
                        >
                          {t('cancelFocus') || 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={handlePostAnnouncement}
                          className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-black shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                        >
                          {t('publish') || 'Publish'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                      {t('broadcastOwnerOnly') || 'Only workspace owners can publish broadcast announcements.'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 italic text-[11px] font-medium leading-relaxed">
                  {t('clickTeamToBroadcast') || 'Click any Team card on the visual tree to read or broadcast a new announcement notice.'}
                </div>
              )}
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl space-y-3.5 text-left">
              <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                {t('corporateGuidelines') || 'Corporate Guidelines'}
              </h4>
              <p className="text-[11px] text-slate-405 leading-relaxed font-medium">
                {t('corporateGuidelinesDesc') || 'Our organizational structure synchronizes roles dynamically. All modifications here auto-provision unified Lark-style chat threads and calendar overlays.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: RESOURCE CAPACITY & WORKLOAD */}
      {teamOSView === 'workload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map(member => {
              // Retrieve active task workload stats
              const memberTasks = tasks.filter(t => t.assigneeId === member.id || t.assigneeIds?.includes(member.id));
              const activeTasks = memberTasks.filter(t => t.status !== 'completed');
              const totalTaskCount = memberTasks.length;
              const completedTaskCount = memberTasks.filter(t => t.status === 'completed').length;
              const totalEst = memberTasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0);
              const totalAct = memberTasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);
              
              // Base standard capacity limit is 40 hours/week
              const weeklyCapacity = 40;
              const capacityRatio = Math.round((totalEst / weeklyCapacity) * 100);
              
              // Theme color of the allocation progress bar
              let barColor = 'from-emerald-500 to-emerald-600';
              let barBg = 'bg-emerald-500/10';
              let textColor = 'text-emerald-650 dark:text-emerald-400';
              
              if (capacityRatio > 100) {
                barColor = 'from-rose-500 to-rose-600';
                barBg = 'bg-rose-500/10';
                textColor = 'text-rose-600 dark:text-rose-455 font-black';
              } else if (capacityRatio > 80) {
                barColor = 'from-amber-500 to-amber-600';
                barBg = 'bg-amber-500/10';
                textColor = 'text-amber-650 dark:text-amber-455';
              }

              return (
                <div 
                  key={member.id}
                  className="p-5.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    {/* Member header card */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <SignedImage 
                          filePath={member.avatar} 
                          className="w-10 h-10 rounded-full border border-slate-200 object-cover" 
                          alt={member.name} 
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white dark:border-slate-900 ${statusColors[member.status as keyof typeof statusColors]} shrink-0`} />
                      </div>
                      <div className="min-w-0 text-left">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{member.name}</h4>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block mt-0.5">{t(getDeptBadge(member.department).label)}</span>
                      </div>
                    </div>

                    {/* Allocation progress bar */}
                    <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-205/40 dark:border-slate-805">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-450 dark:text-slate-500">Weekly Bandwidth</span>
                        <span className={textColor}>{totalEst}h / {weeklyCapacity}h ({capacityRatio}%)</span>
                      </div>

                      <div className="w-full bg-slate-200/60 dark:bg-slate-800/65 h-2 rounded-full overflow-hidden p-0.5">
                        <div 
                          className={`bg-gradient-to-r ${barColor} h-full rounded-full transition-all duration-300`} 
                          style={{ width: `${Math.min(capacityRatio, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[8.5px] text-slate-400 font-bold mt-1">
                        <span>Logged actuals: {totalAct}h</span>
                        {capacityRatio > 100 ? (
                          <span className="text-rose-500 flex items-center gap-0.5">
                            <ShieldAlert className="w-3 h-3 animate-pulse" />
                            <span>Overload warning!</span>
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-medium">Capacity healthy</span>
                        )}
                      </div>
                    </div>

                    {/* Assigned task lists */}
                    <div className="space-y-2 text-left">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Active Task Checklist ({activeTasks.length})</span>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {activeTasks.length > 0 ? (
                          activeTasks.map(task => (
                            <div key={task.id} className="p-2.5 bg-white dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800/80 rounded-xl text-[10.5px] font-bold text-slate-700 dark:text-slate-300 flex items-start gap-2 justify-between">
                              <span className="line-clamp-1 truncate flex-1">{task.title}</span>
                              <span className="text-[8.5px] text-slate-400 font-bold shrink-0">{task.hoursEstimate || 0}h est</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[9.5px] text-slate-400 italic py-2 text-center border border-dashed border-slate-205 dark:border-slate-805 rounded-xl bg-slate-50/20">
                            Healthy. No pending tasks assigned.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/85 text-left text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                    <span>Task count: {totalTaskCount}</span>
                    <span>Completed: {completedTaskCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: INTEGRATION HUB */}
      {teamOSView === 'integrations' && (
        <TeamIntegrations workspaces={workspaces} members={members} tasks={tasks} />
      )}

      {/* Member Details Modal Backdrop */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 bg-slate-955/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="absolute inset-0" onClick={() => setSelectedMember(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-905/30 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="relative group/avatar cursor-pointer">
                    <SignedImage 
                      filePath={selectedMember.avatar} 
                      className="w-12 h-12 rounded-full border border-slate-250 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 object-cover" 
                      alt={selectedMember.name} 
                    />
                    <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity">
                      <Upload className="w-3.5 h-3.5 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarUpload(selectedMember, e)}
                      />
                    </label>
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-850 dark:text-slate-55 text-base leading-tight">
                        {selectedMember.name}
                      </h3>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border antialiased ${roleLabels[selectedMember.role].bg}`}>
                        {roleLabels[selectedMember.role].text}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-650 dark:text-indigo-400 font-bold block mt-0.5">{selectedMember.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-405">Status:</span>
                  <div
                    className="py-1.5 px-3 bg-slate-50 dark:bg-slate-850 text-slate-750 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusColors[selectedMember.status as 'online' | 'busy' | 'away' | 'offline']}`} />
                    <span>{statusLabelsEng[selectedMember.status as 'online' | 'busy' | 'away' | 'offline']}</span>
                  </div>
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 font-bold transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Navigation Tabs in Details */}
              <div className="flex border-b border-slate-150 dark:border-slate-805 bg-white dark:bg-slate-900 px-6">
                <button
                  onClick={() => setDetailActiveTab('overview')}
                  className={`py-3.5 px-4 text-xs font-black transition-all relative cursor-pointer select-none flex items-center gap-2 ${
                    detailActiveTab === 'overview'
                      ? 'text-indigo-650 dark:text-indigo-400 border-b-2 border-indigo-605 dark:border-indigo-400'
                      : 'text-slate-405 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Overview & Tasks</span>
                </button>
                <button
                  onClick={() => setDetailActiveTab('settings')}
                  className={`py-3.5 px-4 text-xs font-black transition-all relative cursor-pointer select-none flex items-center gap-2 ${
                    detailActiveTab === 'settings'
                      ? 'text-indigo-650 dark:text-indigo-400 border-b-2 border-indigo-605 dark:border-indigo-400'
                      : 'text-slate-405 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Profile Details</span>
                </button>
              </div>

              {/* Modal Body Contents */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {detailActiveTab === 'overview' ? (
                  <div className="space-y-6">
                    {/* Status Message Display */}
                    {(selectedMember.statusMessage || selectedMember.status === 'offline') && (
                      <div className="p-4 bg-indigo-500/5 dark:bg-indigo-950/10 border border-indigo-500/10 rounded-2xl flex items-center justify-between text-left">
                        <div className="text-left">
                          <span className="text-[10px] font-black uppercase text-indigo-500 block mb-1">Current Status</span>
                          <p className="text-xs text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5">
                            {selectedMember.statusEmoji ? <span className="text-sm">{selectedMember.statusEmoji}</span> : null}
                            <span className={selectedMember.statusMessage ? "italic" : "text-slate-400 italic"}>
                              {selectedMember.statusMessage ? `"${selectedMember.statusMessage}"` : "No status message set"}
                            </span>
                          </p>
                        </div>
                        {selectedMember.status === 'offline' && (
                          <div className="text-right">
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Last Active</span>
                            <span className="text-[10px] text-slate-500 font-bold">{formatLastSeen(selectedMember.lastSeenAt)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key stats widgets row */}
                    {(() => {
                      const memberTasks = tasks.filter(t => t.assigneeId === selectedMember.id || t.assigneeIds?.includes(selectedMember.id));
                      const totalAssigned = memberTasks.length;
                      const completed = memberTasks.filter(t => t.status === 'completed').length;
                      const ongoing = totalAssigned - completed;
                      const ratio = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
                      
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="p-3.5 bg-slate-50/10 dark:bg-slate-850/20 border border-slate-150 dark:border-slate-800 rounded-2xl text-center">
                            <ClipboardList className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
                            <p className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none">{totalAssigned}</p>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-sans">Assigned</span>
                          </div>
                          
                          <div className="p-3.5 bg-slate-50/10 dark:bg-slate-850/20 border border-slate-150 dark:border-slate-800 rounded-2xl text-center">
                            <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                            <p className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none">{ongoing}</p>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-sans">In Progress</span>
                          </div>

                          <div className="p-3.5 bg-slate-50/10 dark:bg-slate-850/20 border border-slate-150 dark:border-slate-800 rounded-2xl text-center">
                            <UserCheck className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                            <p className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none">{completed}</p>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-sans">Completed</span>
                          </div>

                          <div className="p-3.5 bg-slate-50/10 dark:bg-slate-855/20 border border-slate-150 dark:border-slate-800 rounded-2xl text-center">
                            <Flame className="w-5 h-5 mx-auto text-rose-550 mb-1" />
                            <p className="text-xl font-black text-slate-800 dark:text-slate-101 leading-none">{ratio}%</p>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-sans">Completion %</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Member details info segments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left side: General Bio & Dept */}
                      <div className="space-y-4">
                        <div className="space-y-1.5 p-4 bg-slate-50/40 dark:bg-slate-850/20 border border-slate-150 dark:border-slate-800/80 rounded-2xl text-left">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{t('bio') || 'Bio'}</span>
                          </h4>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {selectedMember.bio || t('noBiographyYet') || 'No biography updated yet.'}
                          </p>
                        </div>

                        <div className="space-y-1.5 p-4 bg-slate-50/40 dark:bg-slate-850/20 border border-slate-150 dark:border-slate-800/80 rounded-2xl text-left">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t('detailsLabel') || 'Details'}</h4>
                          <div className="space-y-2 text-xs font-semibold text-slate-750 dark:text-slate-350">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-slate-400" />
                              <span>{t('department') || 'Department'}: <strong>{t(getDeptBadge(selectedMember.department).label) || getDeptBadge(selectedMember.department).label}</strong></span>
                            </div>
                            {selectedMember.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <span>{t('phone') || 'Phone'}: <a href={`tel:${selectedMember.phone}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{selectedMember.phone}</a></span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>{t('joinedDate') || 'Joined'}: <span className="text-slate-500">{selectedMember.joinedDate || '2026'}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Tasks distribution list */}
                      <div className="space-y-3 text-left">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-554" />
                          <span>Task List ({tasks.filter(t => t.assigneeId === selectedMember.id || t.assigneeIds?.includes(selectedMember.id)).length})</span>
                        </h4>
                        
                        <div className="max-h-64 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                          {(() => {
                            const memberTasks = tasks.filter(t => t.assigneeId === selectedMember.id || t.assigneeIds?.includes(selectedMember.id));
                            if (memberTasks.length === 0) {
                              return (
                                <div className="p-8 text-center border border-dashed border-slate-205 dark:border-slate-805 rounded-2xl text-slate-450 italic text-[11px] font-medium">
                                  No tasks currently assigned to this colleague.
                                </div>
                              );
                            }

                            const priorityNames = {
                              low: { label: 'Low', color: 'bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400' },
                              medium: { label: 'Medium', color: 'bg-blue-50 text-blue-600 dark:bg-blue-952/30 dark:text-blue-400' },
                              high: { label: 'High', color: 'bg-amber-50 text-amber-600 dark:bg-amber-952/30 dark:text-amber-400' },
                              urgent: { label: 'Urgent', color: 'bg-rose-50 text-rose-600 dark:bg-rose-952/30 dark:text-rose-400' }
                            };

                            const statusStrings = {
                              todo: { label: 'To Do', color: 'text-slate-500' },
                              inprogress: { label: 'In Progress', color: 'text-indigo-600 dark:text-indigo-400' },
                              review: { label: 'Review', color: 'text-cyan-650 dark:text-cyan-400' },
                              completed: { label: 'Completed', color: 'text-emerald-655 dark:text-emerald-400' }
                            };

                            return memberTasks.map(task => (
                              <div
                                key={task.id}
                                className={`p-3 bg-white dark:bg-slate-850/60 border rounded-2xl transition-all ${
                                  task.status === 'completed' 
                                    ? 'border-emerald-100/50 dark:border-emerald-950 bg-emerald-50/5 dark:bg-emerald-950/5' 
                                    : 'border-slate-150 dark:border-slate-800 hover:border-slate-250 dark:hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-xs font-bold text-slate-800 dark:text-slate-105 leading-snug line-clamp-1 ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-550' : ''}`}>
                                    {task.title}
                                  </p>
                                  <span className={`text-[8px] font-black px-1.5 py-px rounded-md shrink-0 uppercase tracking-wide ${priorityNames[task.priority].color}`}>
                                    {priorityNames[task.priority].label}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-bold mt-1.5 text-slate-450">
                                  <span className={`${statusStrings[task.status].color}`}>{statusStrings[task.status].label}</span>
                                  {task.dueDate && (
                                    <span>Due: <span className="text-slate-500">{task.dueDate}</span></span>
                                  )}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Settings tab - Profile editor
                  <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 font-sans text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wider font-sans">Full Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 outline-none text-slate-800 dark:text-slate-100 font-semibold focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-555 dark:text-slate-400 uppercase tracking-wider font-sans">Email Address</label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-55 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 outline-none text-slate-400 dark:text-slate-500 font-semibold cursor-not-allowed"
                          disabled
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-555 dark:text-slate-400 uppercase tracking-wider font-sans">Phone Number</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="E.g., +84 90 123 4567"
                          className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 outline-none text-slate-800 dark:text-slate-100 font-semibold focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-555 dark:text-slate-400 uppercase tracking-wider font-sans">Department</label>
                        <select
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 outline-none text-slate-800 dark:text-slate-100 font-semibold focus:border-indigo-500 cursor-pointer"
                        >
                          {DEPARTMENTS.map(d => (
                            <option key={d.id} value={d.id}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-555 dark:text-slate-400 uppercase tracking-wider font-sans">System Authority Role</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'admin', label: 'Admin (Quản trị)', desc: 'Full control' },
                          { id: 'member', label: 'Member (Thành viên)', desc: 'Standard access' },
                          { id: 'guest', label: 'Guest (Khách)', desc: 'Limited views' }
                        ].map(roleOpt => (
                          <button
                            key={roleOpt.id}
                            type="button"
                            onClick={() => setEditRole(roleOpt.id as any)}
                            className={`p-3 text-left rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                              editRole === roleOpt.id
                                ? 'border-indigo-500 bg-indigo-500/5 text-indigo-750 dark:text-indigo-400 dark:bg-indigo-950/20'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350'
                            }`}
                          >
                            <p className="font-extrabold">{roleOpt.label}</p>
                            <span className="text-[9px] text-slate-400 font-normal">{roleOpt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-555 dark:text-slate-400 uppercase tracking-wider font-sans">Biography / Personal Notes</label>
                      <textarea
                        rows={3}
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Write a short summary..."
                        className="w-full p-3 text-xs rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setDetailActiveTab('overview')}
                        className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                      >
                        Save Profiles Details
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Staff Enrollment/Invite Modal Overlay */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSendInvites={handleSendInvites}
        workspaceName={currentWorkspaceName}
      />
    </div>
  );
}
