"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Workspace, Task, WorkspaceRole } from '../types';
import { 
  Users, UserPlus, Shield, Sparkles, Mail, Circle,
  Key, Trash2, Globe, HeartHandshake, Compass, Upload,
  Check, ChevronDown, UserMinus, Plus, Info, LayoutGrid,
  Award, Activity, Star, Phone, Search, X, SlidersHorizontal,
  Briefcase, Calendar, CheckSquare, ClipboardList, Flame, Edit, 
  ExternalLink, UserCheck, Clock, GitBranch, ShieldAlert, CheckCircle2, 
  AlertTriangle, MessageSquare, Megaphone, LayoutDashboard, PlugZap,
  List, Copy, Crown, ShieldCheck, Building2, UserCircle2, ArrowRight,
  TrendingUp, Laptop, Palette, Filter, RefreshCw
} from 'lucide-react';
import { supabase, getCleanChannel } from '../supabaseClient';
import SignedImage from './SignedImage';
import InviteModal from './InviteModal';
import { setUserPresenceStatus } from '../hooks/useUserPresence';
import { renderSpaceIcon } from './EmojiIconPicker';
import TeamManagement, { DepartmentRow, TeamMemberRow, TeamRow } from './team/TeamManagement';
import { TeamCommandCenter, TeamIntegrations } from './team/TeamCommandCenter';
import WorkspaceContactsTab from './contacts/WorkspaceContactsTab';
import ManualAddMemberModal from './workspace/ManualAddMemberModal';
import ConfirmModal from './ConfirmModal';

interface TeamDirectoryProps {
  members: User[];
  tasks: Task[];
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onAddMember: (member: Omit<User, 'id'>) => void;
  onUpdateMember: (member: User, options?: { persist?: boolean }) => void | Promise<void>;
  onDeleteMember: (id: string) => void;
  onAddSyncLog: (action: string) => void;
  currentUser?: any;
  onSendWorkspaceInvites?: (emails: string[], role: string) => void;
  onStartChat?: (memberId: string) => void;
}

const DEPARTMENTS = [
  { id: 'd-hq', label: 'Executive Headquarters', icon: 'Building2', viLabel: 'Ban Giám đốc & Điều hành' },
  { id: 'd-eng', label: 'Engineering & Technology', icon: 'Laptop', viLabel: 'Kỹ thuật & Công nghệ' },
  { id: 'd-design', label: 'Design & Product Experience', icon: 'Palette', viLabel: 'Thiết kế & Trải nghiệm Sản phẩm' },
  { id: 'd-growth', label: 'Marketing & Sales Growth', icon: 'TrendingUp', viLabel: 'Tiếp thị & Tăng trưởng Bán hàng' },
];

const getDeptBadge = (deptId?: string, isVi = false) => {
  switch (deptId) {
    case 'd-hq': 
      return { 
        label: isVi ? 'Ban Điều hành' : 'Executive HQ', 
        icon: 'Building2', 
        class: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-700 dark:text-indigo-300' 
      };
    case 'd-eng': 
      return { 
        label: isVi ? 'Kỹ thuật & Công nghệ' : 'Engineering', 
        icon: 'Laptop', 
        class: 'bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-300' 
      };
    case 'd-design': 
      return { 
        label: isVi ? 'Thiết kế Sản phẩm' : 'Product Design', 
        icon: 'Palette', 
        class: 'bg-purple-500/10 border-purple-500/25 text-purple-700 dark:text-purple-300' 
      };
    case 'd-growth': 
      return { 
        label: isVi ? 'Tiếp thị & Tăng trưởng' : 'Growth & Sales', 
        icon: 'TrendingUp', 
        class: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300' 
      };
    default: 
      return { 
        label: isVi ? 'Thành viên chung' : 'General Member', 
        icon: 'Users', 
        class: 'bg-slate-500/10 border-slate-500/25 text-slate-700 dark:text-slate-300' 
      };
  }
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
  const { t, locale, isVietnamese } = useTranslation();
  const isVi = locale === 'vi' || isVietnamese;

  // Streamlined 5 Core Views: 'overview' | 'directory' | 'teams' | 'org_chart' | 'contacts'
  const [teamOSView, setTeamOSView] = useState<'overview' | 'directory' | 'teams' | 'org_chart' | 'contacts'>('overview');
  const [directoryViewMode, setDirectoryViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom status popover state
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [modalTaskFilter, setModalTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [orgChartDeptFilter, setOrgChartDeptFilter] = useState<string>('all');
  const me = members.find(m => m.id === currentUser?.id || m.userId === currentUser?.id || m.email === currentUser?.email)
    || members.find(m => m.id === 'user');
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const currentWorkspaceName = activeWorkspace?.name || 'Apexa Workspace';

  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(activeWorkspace?.membershipRole || null);
  const isOwner = workspaceRole === 'owner'
    || workspaceRole === 'admin'
    || currentUser?.role === 'admin'
    || me?.role === 'admin'
    || activeWorkspace?.membershipRole === 'owner'
    || activeWorkspace?.membershipRole === 'admin'
    || activeWorkspace?.user_id === currentUser?.id
    || activeWorkspace?.user_id === me?.id;

  const [statusVal, setStatusVal] = useState<'online' | 'busy' | 'away' | 'offline'>(me?.customStatus || 'online');
  const [statusMsg, setStatusMsg] = useState(me?.statusMessage || '');
  const [statusEmj, setStatusEmj] = useState(me?.statusEmoji || '');

  // DB Hierarchical Team OS states
  const [dbDepts, setDbDepts] = useState<DepartmentRow[]>([]);
  const [dbTeams, setDbTeams] = useState<TeamRow[]>([]);
  const [dbTeamMembers, setDbTeamMembers] = useState<TeamMemberRow[]>([]);
  const [membershipRoles, setMembershipRoles] = useState<Record<string, WorkspaceRole>>({});
  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [hierarchyError, setHierarchyError] = useState('');

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
    setHierarchyLoading(true);
    setHierarchyError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeWorkspaceId);

      const [departmentsResult, teamsResult, membershipsResult] = await Promise.all([
        (async () => {
          try {
            return await supabase.from('departments').select('id,name,description,parent_id,manager_id').order('name');
          } catch (e) {
            return { data: null, error: e };
          }
        })(),
        (async () => {
          try {
            return await supabase.from('teams').select('*').eq('workspace_id', activeWorkspaceId).order('created_at', { ascending: true });
          } catch (e) {
            return { data: null, error: e };
          }
        })(),
        (async () => {
          if (!isUuid || !session?.user) return { data: [], error: null };
          try {
            return await supabase.from('workspace_memberships').select('user_id,role,status').eq('workspace_id', activeWorkspaceId).eq('status', 'active');
          } catch (e) {
            return { data: [], error: e };
          }
        })(),
      ]);

      const fallbackDepts: DepartmentRow[] = [
        { id: 'd-hq', name: 'Executive Headquarters', description: 'Corporate Strategy & Leadership office', parent_id: null, manager_id: null },
        { id: 'd-eng', name: 'Engineering & Technology', description: 'Product development, infrastructure and QA teams', parent_id: 'd-hq', manager_id: null },
        { id: 'd-design', name: 'Design & Product Experience', description: 'UI/UX design, user research, and branding', parent_id: 'd-hq', manager_id: null },
        { id: 'd-growth', name: 'Marketing & Sales Growth', description: 'Customer acquisition, analytics, and content marketing', parent_id: 'd-hq', manager_id: null },
      ];

      const depts: DepartmentRow[] = (departmentsResult.data && departmentsResult.data.length > 0)
        ? (departmentsResult.data as DepartmentRow[])
        : fallbackDepts;

      let tms: TeamRow[] = (teamsResult.data as TeamRow[]) || [];
      if (!tms.length && typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(`apexa_teams_${activeWorkspaceId}`);
          if (cached) tms = JSON.parse(cached);
        } catch (_) {}
      }

      const teamIds = (tms || []).map((team: TeamRow) => team.id);
      let teamMembersData: TeamMemberRow[] = [];

      if (teamIds.length) {
        try {
          const membersResult = await supabase.from('team_members').select('*').in('team_id', teamIds);
          if (membersResult.data) {
            teamMembersData = membersResult.data as TeamMemberRow[];
          }
        } catch (_) {}
      }

      if (!teamMembersData.length && typeof window !== 'undefined') {
        try {
          const cachedMembers = localStorage.getItem(`apexa_team_members_${activeWorkspaceId}`);
          if (cachedMembers) teamMembersData = JSON.parse(cachedMembers);
        } catch (_) {}
      }

      const sessionUserId = session?.user?.id;
      const currentDatabaseMemberId = sessionUserId ? `user-${sessionUserId}` : 'user';
      setDbDepts(depts);
      setDbTeams(tms.map((team: TeamRow) => ({
        ...team,
        leader_id: currentDatabaseMemberId && team.leader_id === currentDatabaseMemberId ? 'user' : team.leader_id,
      })));
      setDbTeamMembers(teamMembersData.map((item: TeamMemberRow) => ({
        ...item,
        member_id: currentDatabaseMemberId && item.member_id === currentDatabaseMemberId ? 'user' : item.member_id,
      })));

      const roles = Object.fromEntries(((membershipsResult.data || []) as any[]).map((item: any) => [item.user_id, item.role as WorkspaceRole]));
      setMembershipRoles(roles);
      if (sessionUserId && roles[sessionUserId]) {
        setWorkspaceRole(roles[sessionUserId]);
      } else {
        setWorkspaceRole(activeWorkspace?.membershipRole || null);
      }
    } catch (e) {
      console.warn('Hierarchy fetch handled gracefully:', e);
    } finally {
      setHierarchyLoading(false);
    }
  }, [activeWorkspaceId, activeWorkspace?.membershipRole]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  useEffect(() => {
    const channel = getCleanChannel(`team-directory-${activeWorkspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `workspace_id=eq.${activeWorkspaceId}` }, fetchHierarchy)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, fetchHierarchy)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, fetchHierarchy)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_memberships', filter: `workspace_id=eq.${activeWorkspaceId}` }, fetchHierarchy)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeWorkspaceId, fetchHierarchy]);

  // Modals & Active Selections
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'overview' | 'settings'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
  const [contactsCount, setContactsCount] = useState<number>(0);
  const [showAddExistingDropdown, setShowAddExistingDropdown] = useState(false);
  const [scopeTab, setScopeTab] = useState<'workspace' | 'all'>('workspace');

  // Load and listen for workspace contacts count
  useEffect(() => {
    let isMounted = true;
    const loadContactsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('workspace_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', activeWorkspaceId);
        if (!error && typeof count === 'number' && isMounted) {
          setContactsCount(count);
        }
      } catch (_) {}
    };
    loadContactsCount();

    const channel = getCleanChannel(`contacts-count-${activeWorkspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_contacts', filter: `workspace_id=eq.${activeWorkspaceId}` }, () => {
        loadContactsCount();
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [activeWorkspaceId]);

  // Member editing form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('d-eng');
  const [editRole, setEditRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [editBio, setEditBio] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');

  const handleOpenDetail = (member: User) => {
    setSelectedMember(member);
    setDetailActiveTab('overview');
    const membershipRole = member.userId ? membershipRoles[member.userId] : member.role;
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhone(member.phone || '');
    setEditDepartment(member.department || 'd-eng');
    setEditRole(membershipRole === 'admin' || membershipRole === 'member' || membershipRole === 'guest' ? membershipRole : member.role);
    setEditBio(member.bio || '');
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    const canEditProfile = isOwner || selectedMember.id === me?.id || selectedMember.userId === currentUser?.id;
    if (!canEditProfile) return;

    const updatedUser: User = {
      ...selectedMember,
      name: editName,
      email: editEmail,
      phone: editPhone,
      department: editDepartment,
      role: editRole,
      bio: editBio
    };

    try {
      if (isOwner && selectedMember.id !== me?.id) {
        const { data: { session } } = await supabase.auth.getSession();
        const databaseMemberId = selectedMember.id === 'user' && session?.user
          ? `user-${session.user.id}`
          : selectedMember.id;
        const { error } = await supabase.rpc('update_workspace_member_profile', {
          p_workspace_id: activeWorkspaceId,
          p_member_id: databaseMemberId,
          p_name: editName,
          p_phone: editPhone || null,
          p_department: editDepartment || null,
          p_bio: editBio || null,
          p_role: editRole,
        });
        if (error) throw error;
        await onUpdateMember(updatedUser, { persist: false });
        if (selectedMember.userId) {
          setMembershipRoles(prev => ({ ...prev, [selectedMember.userId!]: editRole }));
        }
      } else {
        await onUpdateMember(updatedUser);
      }
      onAddSyncLog(`Updated member profile details: ${editName}`);
      setSelectedMember(updatedUser);
      (window as any).playSystemSound?.('success');
    } catch (error) {
      console.error('Unable to update team member:', error);
      onAddSyncLog(`Could not update member: ${editName}`);
    }
  };

  // Deduplicated unified members list to prevent any duplicate accounts
  const deduplicatedMembers = useMemo<User[]>(() => {
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();
    const list: User[] = [];

    for (const m of members) {
      const email = (m.email || '').toLowerCase().trim();
      const isMe = m.id === 'user' || m.id === currentUser?.id || m.userId === currentUser?.id || (email && currentUser?.email && email === currentUser.email.toLowerCase().trim());
      
      if (isMe) {
        if (seenIds.has('user')) continue;
        seenIds.add('user');
        if (email) seenEmails.add(email);
        list.push({
          ...m,
          name: currentUser?.name || m.name,
          avatar: currentUser?.avatar || m.avatar,
          role: currentUser?.role || m.role,
          isPremium: currentUser?.isPremium ?? m.isPremium
        });
      } else {
        if (email && seenEmails.has(email)) continue;
        if (seenIds.has(m.id)) continue;
        if (email) seenEmails.add(email);
        seenIds.add(m.id);
        list.push(m);
      }
    }
    return list;
  }, [members, currentUser]);

  // Statistics calculation for the active workspace
  const workspaceMembers = useMemo<User[]>(() => {
    return deduplicatedMembers.filter((m: User) => m.workspaceIds?.includes(activeWorkspaceId));
  }, [deduplicatedMembers, activeWorkspaceId]);

  const workspaceTasks = tasks.filter(task => !task.workspaceId || task.workspaceId === activeWorkspaceId);
  const totalWorkspaceCount = workspaceMembers.length;
  const onlineWorkspaceCount = workspaceMembers.filter(m => m.status === 'online').length;
  const busyWorkspaceCount = workspaceMembers.filter(m => m.status === 'busy').length;
  const activeNowCount = onlineWorkspaceCount + busyWorkspaceCount;

  // Task metrics across workspace
  const totalTasksCount = workspaceTasks.length;
  const completedTasksCount = workspaceTasks.filter(t => t.status === 'completed').length;
  const overallCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const totalPendingTasks = totalTasksCount - completedTasksCount;

  const statusColors = {
    online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] ring-2 ring-emerald-500/30',
    busy: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] ring-2 ring-rose-500/30',
    away: 'bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.7)] ring-2 ring-amber-500/30',
    offline: 'bg-slate-400 ring-2 ring-slate-400/20'
  };

  const statusLabels = {
    online: isVi ? 'Trực tuyến' : 'Online',
    busy: isVi ? 'Đang bận' : 'Busy',
    away: isVi ? 'Vắng mặt' : 'Away',
    offline: isVi ? 'Ngoại tuyến' : 'Offline'
  };

  const roleLabels = {
    admin: { 
      text: isVi ? 'Quản trị viên' : 'Admin', 
      badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60' 
    },
    member: { 
      text: isVi ? 'Thành viên' : 'Member', 
      badge: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60' 
    },
    guest: { 
      text: isVi ? 'Khách mời' : 'Guest', 
      badge: 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700' 
    }
  };

  // Find users in the organization not yet in this active workspace
  const membersAvailableToEnroll = members.filter(m => Boolean(m.userId && !membershipRoles[m.userId]));

  const handleEnrollExisting = async (member: User) => {
    if (!isOwner || !member.userId) return;
    const role: Exclude<WorkspaceRole, 'owner'> = member.role === 'admin' ? 'admin' : member.role;
    const { error } = await supabase.from('workspace_memberships').upsert({
      workspace_id: activeWorkspaceId,
      user_id: member.userId,
      role,
      status: 'active',
    }, { onConflict: 'workspace_id,user_id' });
    if (error) {
      onAddSyncLog(`Could not add "${member.name}" to workspace: ${error.message}`);
      return;
    }
    const updatedIds = Array.from(new Set([...(member.workspaceIds || []), activeWorkspaceId]));
    await onUpdateMember({ ...member, workspaceIds: updatedIds }, { persist: false });
    setMembershipRoles(prev => ({ ...prev, [member.userId!]: role }));
    onAddSyncLog(`Appointed member "${member.name}" to workspace "${currentWorkspaceName}"`);
    setShowAddExistingDropdown(false);
  };

  const promptRemoveFromWorkspace = (member: User) => {
    if (!isOwner || member.id === me?.id || !member.userId) return;
    if (membershipRoles[member.userId] === 'owner') return;
    setMemberToRemove(member);
  };

  const confirmRemoveFromWorkspace = async () => {
    if (!memberToRemove || !memberToRemove.userId) return;
    const member = memberToRemove;
    setMemberToRemove(null);

    const { error } = await supabase
      .from('workspace_memberships')
      .delete()
      .eq('workspace_id', activeWorkspaceId)
      .eq('user_id', member.userId);
    if (error) {
      onAddSyncLog(`Could not remove "${member.name}" from workspace: ${error.message}`);
      return;
    }
    const updatedIds = (member.workspaceIds || []).filter(id => id !== activeWorkspaceId);
    await onUpdateMember({ ...member, workspaceIds: updatedIds }, { persist: false });
    setMembershipRoles(prev => {
      const next = { ...prev };
      delete next[member.userId!];
      return next;
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

    const formattedJoinedDate = new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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

  const displayMembers = scopeTab === 'workspace' ? workspaceMembers : deduplicatedMembers;

  // Filter implementation
  const filteredMembers = displayMembers.filter(m => {
    const query = searchQuery.toLowerCase().trim();
    const deptInfo = getDeptBadge(m.department, isVi);
    const matchesSearch = !query || 
      m.name.toLowerCase().includes(query) || 
      m.email.toLowerCase().includes(query) || 
      (m.phone && m.phone.toLowerCase().includes(query)) ||
      deptInfo.label.toLowerCase().includes(query) ||
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

  const handleSaveStatus = async (newStatus: 'online' | 'busy' | 'away' | 'offline', newMsg: string, newEmoji: string) => {
    try {
      setSavingStatus(true);
      setStatusVal(newStatus);
      setStatusMsg(newMsg);
      setStatusEmj(newEmoji);
      await setUserPresenceStatus(newStatus, newMsg, newEmoji);
      setShowStatusPopover(false);
      (window as any).playSystemSound?.('success');
      onAddSyncLog(isVi ? `Đã cập nhật trạng thái: ${statusLabels[newStatus]}` : `Updated status: ${statusLabels[newStatus]}`);
    } catch (err) {
      console.error('Failed to update presence status:', err);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCopyEmail = (e: React.MouseEvent, memberId: string, email: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedId(memberId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2 pb-12">
      
      {/* 1. TOP HEADER: Modern Neu-SaaS Header with Pulse & Actions */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {isVi ? 'Thành viên & Đội ngũ' : 'Members & Teams'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  <Building2 className="w-3 h-3 text-indigo-500" />
                  <span>{currentWorkspaceName}</span>
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>{workspaceMembers.length} {isVi ? 'thành viên' : 'members'}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  {activeNowCount} {isVi ? 'đang hoạt động' : 'active now'}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>{dbTeams.length} {isVi ? 'nhóm chuyên trách' : 'squads'}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick enroll button for admins */}
            {isOwner && membersAvailableToEnroll.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddExistingDropdown(!showAddExistingDropdown)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isVi ? 'Thêm từ tổ chức' : 'Add from organization'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                <AnimatePresence>
                  {showAddExistingDropdown && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowAddExistingDropdown(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 6 }}
                        className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-2 overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                          {isVi ? `Thêm vào ${currentWorkspaceName}` : `Add to ${currentWorkspaceName}`}
                        </div>
                        <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 space-y-1">
                          {membersAvailableToEnroll.map(m => (
                            <button
                              key={m.id}
                              onClick={() => handleEnrollExisting(m)}
                              className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <SignedImage 
                                filePath={m.avatar} 
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                alt={m.name}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{m.name}</p>
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

            {/* Manual add member button */}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  (window as any).playSystemSound?.('click');
                  setShowManualAddModal(true);
                }}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:border-indigo-400"
                title={isVi ? "Thêm tài khoản thủ công hoặc từ hệ thống" : "Manually add member profile"}
              >
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>{isVi ? 'Thêm thủ công' : 'Manual Add'}</span>
              </button>
            )}

            {/* Main Invite button */}
            <button
              type="button"
              id="btn_open_invite_member"
              onClick={() => {
                (window as any).playSystemSound?.('click');
                setShowInviteModal(true);
              }}
              className="px-4.5 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isVi ? 'Mời thành viên' : 'Invite Members'}</span>
            </button>
          </div>
        </div>

        {/* 2. PRIMARY NAVIGATION: 5 Core Focused Views */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
          <nav className="inline-flex rounded-xl bg-slate-100/90 dark:bg-slate-800/70 p-1 border border-slate-200/60 dark:border-slate-800 gap-1 flex-wrap">
            {[
              { id: 'overview', label: isVi ? 'Tổng quan' : 'Overview', icon: LayoutDashboard },
              { id: 'directory', label: isVi ? 'Thành viên' : 'Members', icon: Users, count: totalWorkspaceCount },
              { id: 'teams', label: isVi ? 'Phòng ban & Nhóm' : 'Departments & Teams', icon: Building2, count: dbTeams.length },
              { id: 'org_chart', label: isVi ? 'Sơ đồ tổ chức' : 'Org Chart', icon: GitBranch },
              { id: 'contacts', label: isVi ? 'Danh bạ đối tác' : 'Contacts', icon: Phone, count: contactsCount > 0 ? contactsCount : undefined },
            ].map(tab => {
              const isActive = teamOSView === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setTeamOSView(tab.id as any);
                    (window as any).playSystemSound?.('click');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                      isActive 
                        ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300' 
                        : 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Current user quick status indicator with interactive Popover */}
          {me && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusPopover(!showStatusPopover)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer shadow-2xs group"
                title={isVi ? "Nhấn để thay đổi trạng thái" : "Click to update status"}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${statusColors[statusVal]}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{statusLabels[statusVal]}</span>
                {statusMsg && (
                  <span className="text-xs text-slate-400 italic max-w-36 truncate hidden sm:inline">
                    {statusEmj ? `${statusEmj} ` : ''}"{statusMsg}"
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform" />
              </button>

              <AnimatePresence>
                {showStatusPopover && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowStatusPopover(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-40 p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="text-left">
                          <p className="text-xs font-black text-slate-900 dark:text-white">{isVi ? 'Trạng thái hoạt động' : 'Presence Status'}</p>
                          <p className="text-[10px] text-slate-400">{isVi ? 'Hiển thị cho các thành viên trong workspace' : 'Visible to all workspace members'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowStatusPopover(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 4 Status Pills */}
                      <div className="grid grid-cols-2 gap-2">
                        {(['online', 'busy', 'away', 'offline'] as const).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatusVal(st)}
                            className={`p-2 rounded-xl text-left text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                              statusVal === st
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/70 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${statusColors[st]}`} />
                            <span className="text-[11px]">{statusLabels[st]}</span>
                          </button>
                        ))}
                      </div>

                      {/* Custom status message */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {isVi ? 'Thông điệp trạng thái' : 'Status Message'}
                        </label>
                        <input
                          type="text"
                          maxLength={80}
                          value={statusMsg}
                          onChange={(e) => setStatusMsg(e.target.value)}
                          placeholder={isVi ? "Ví dụ: Đang họp sprint, Đi vắng..." : "e.g. In sprint meeting, Away for lunch..."}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-slate-900 dark:text-slate-100 font-semibold focus:border-indigo-500"
                        />
                      </div>

                      {/* Quick Emojis */}
                      <div className="space-y-1 text-left">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {isVi ? 'Biểu tượng nhanh' : 'Quick Emoji'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {['💻', '🎯', '🚀', '☕', '🎧', '🌴', '📞', '💡'].map(emj => (
                            <button
                              key={emj}
                              type="button"
                              onClick={() => setStatusEmj(statusEmj === emj ? '' : emj)}
                              className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center transition-all cursor-pointer ${
                                statusEmj === emj
                                  ? 'bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-400 scale-110'
                                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {emj}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        {(statusMsg || statusEmj) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusMsg('');
                              setStatusEmj('');
                            }}
                            className="text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            {isVi ? 'Xóa ghi chú' : 'Clear message'}
                          </button>
                        ) : <div />}

                        <button
                          type="button"
                          onClick={() => handleSaveStatus(statusVal, statusMsg, statusEmj)}
                          disabled={savingStatus}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          {savingStatus ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu trạng thái' : 'Save Status')}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {hierarchyError && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20 text-xs font-bold text-rose-700 dark:text-rose-400">
          <span>{isVi ? `Không thể đồng bộ dữ liệu Team: ${hierarchyError}` : `Sync error: ${hierarchyError}`}</span>
          <button type="button" onClick={() => void fetchHierarchy()} className="rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 text-[10px] font-black shadow-xs cursor-pointer">
            {isVi ? 'Thử lại' : 'Retry'}
          </button>
        </div>
      )}

      {/* 2.5 VIEW TAB 0: COMMAND CENTER & HEALTH HUB */}
      {teamOSView === 'overview' && (
        <div className="space-y-6">
          <TeamCommandCenter
            members={workspaceMembers}
            tasks={workspaceTasks}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onInvite={() => {
              (window as any).playSystemSound?.('click');
              setShowInviteModal(true);
            }}
            onOpenDirectory={() => setTeamOSView('directory')}
            onOpenWorkload={() => setTeamOSView('directory')}
            onStartChat={onStartChat}
          />
          <TeamIntegrations
            workspaces={workspaces}
            members={workspaceMembers}
            tasks={workspaceTasks}
          />
        </div>
      )}

      {/* 3. VIEW TAB 1: MEMBERS DIRECTORY */}
      {teamOSView === 'directory' && (
        <div className="space-y-5">
          
          {/* A. QUICK METRICS RIBBON: High density, clean stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {isVi ? 'Thành viên Workspace' : 'Workspace Members'}
                </span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {totalWorkspaceCount}
                </span>
                <span className="text-xs font-semibold text-slate-400">{isVi ? 'nhân sự' : 'members'}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 truncate">
                {isVi ? 'Trong không gian' : 'In workspace'} <span className="font-bold text-slate-700 dark:text-slate-300">{currentWorkspaceName}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {isVi ? 'Đang hoạt động' : 'Live Presence'}
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                  {onlineWorkspaceCount}
                </span>
                <span className="text-xs font-semibold text-slate-400">{isVi ? 'trực tuyến' : 'online'}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>{busyWorkspaceCount} {isVi ? 'đang bận / trong cuộc họp' : 'busy / in meetings'}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {isVi ? 'Tiến độ công việc' : 'Task Completion'}
                </span>
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {overallCompletionRate}%
                </span>
                <span className="text-xs font-semibold text-slate-400">{completedTasksCount}/{totalTasksCount} {isVi ? 'việc' : 'tasks'}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalPendingTasks}</span> {isVi ? 'việc đang thực hiện' : 'tasks pending'}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {isVi ? 'Cơ cấu tổ chức' : 'Org Structure'}
                </span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {dbTeams.length}
                </span>
                <span className="text-xs font-semibold text-slate-400">{isVi ? 'nhóm' : 'teams'}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {isVi ? 'Phân bổ qua' : 'Across'} <span className="font-bold text-slate-700 dark:text-slate-300">{dbDepts.length} {isVi ? 'phòng ban' : 'departments'}</span>
              </p>
            </div>
          </div>

          {/* B. TOOLBAR: Search, Scope Switcher, Filters, and View Mode Toggle */}
          <div className="p-3.5 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-xs flex flex-col lg:flex-row items-center gap-3">
            
            {/* Scope segmented control: Workspace vs Organization */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/70 p-1 border border-slate-200/60 dark:border-slate-700/60 shrink-0 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setScopeTab('workspace')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scopeTab === 'workspace'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {isVi ? `Trong workspace (${totalWorkspaceCount})` : `In Workspace (${totalWorkspaceCount})`}
              </button>
              <button
                type="button"
                onClick={() => setScopeTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scopeTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {isVi ? `Toàn tổ chức (${deduplicatedMembers.length})` : `All Org (${deduplicatedMembers.length})`}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isVi ? "Tìm theo tên, email, phòng ban, số điện thoại..." : "Search name, email, department, phone..."}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 hover:bg-slate-50 focus:bg-white dark:bg-slate-950/70 dark:hover:bg-slate-950 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold outline-none cursor-pointer focus:border-indigo-500"
              >
                <option value="all">{isVi ? 'Tất cả phòng ban' : 'All departments'}</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{isVi ? d.viLabel : d.label}</option>
                ))}
              </select>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold outline-none cursor-pointer focus:border-indigo-500"
              >
                <option value="all">{isVi ? 'Tất cả vai trò' : 'All roles'}</option>
                <option value="admin">{isVi ? 'Quản trị viên (Admin)' : 'Admin'}</option>
                <option value="member">{isVi ? 'Thành viên (Member)' : 'Member'}</option>
                <option value="guest">{isVi ? 'Khách (Guest)' : 'Guest'}</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold outline-none cursor-pointer focus:border-indigo-500"
              >
                <option value="all">{isVi ? 'Tất cả trạng thái' : 'All statuses'}</option>
                <option value="online">{isVi ? 'Trực tuyến' : 'Online'}</option>
                <option value="busy">{isVi ? 'Đang bận' : 'Busy'}</option>
                <option value="away">{isVi ? 'Vắng mặt' : 'Away'}</option>
                <option value="offline">{isVi ? 'Ngoại tuyến' : 'Offline'}</option>
              </select>

              {/* View switch: Grid vs Table */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    directoryViewMode === 'grid' 
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title={isVi ? "Chế độ lưới" : "Grid View"}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    directoryViewMode === 'table' 
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title={isVi ? "Chế độ bảng" : "Table View"}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {(searchQuery || filterRole !== 'all' || filterStatus !== 'all' || filterDept !== 'all') && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer"
                >
                  {isVi ? 'Đặt lại' : 'Reset'}
                </button>
              )}
            </div>
          </div>

          {/* Members count indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span>
              {isVi 
                ? `Hiển thị ${filteredMembers.length} trên tổng số ${displayMembers.length} nhân sự` 
                : `Showing ${filteredMembers.length} of ${displayMembers.length} members`}
            </span>
          </div>

          {/* C. MEMBERS DISPLAY: GRID VIEW */}
          {directoryViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredMembers.map((member) => {
                const memberTasks = workspaceTasks.filter(t => t.assigneeId === member.id || t.assigneeIds?.includes(member.id));
                const totalCount = memberTasks.length;
                const completedCount = memberTasks.filter(t => t.status === 'completed').length;
                const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                const pendingCount = totalCount - completedCount;
                const deptBadge = getDeptBadge(member.department, isVi);
                const isCurrentUser = member.id === 'user' || member.id === me?.id;
                const roleMeta = roleLabels[member.role] || roleLabels.member;
                const currentStatus = (member.status || 'offline') as keyof typeof statusColors;

                return (
                  <motion.div
                    key={member.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="group relative rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-5 shadow-sm hover:shadow-lg hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      
                      {/* Top Pill Bar: Role badge & Presence status */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${roleMeta.badge}`}>
                          {roleMeta.text}
                        </span>

                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColors[currentStatus]}`} />
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {statusLabels[currentStatus] || statusLabels.offline}
                          </span>
                        </div>
                      </div>

                      {/* Avatar, Name, Email with 1-click copy */}
                      <div className="flex items-start gap-3.5">
                        <div 
                          className="relative shrink-0 cursor-pointer"
                          onClick={() => handleOpenDetail(member)}
                        >
                          <SignedImage 
                            filePath={member.avatar} 
                            className="w-13 h-13 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 group-hover:border-indigo-500/40 transition-colors shadow-xs" 
                            alt={member.name} 
                          />
                          <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${statusColors[currentStatus]}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 
                            onClick={() => handleOpenDetail(member)}
                            className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            {member.name}
                          </h3>

                          {/* Unmasked, clean email with 1-click copy */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                              {member.email}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyEmail(e, member.id, member.email)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer p-0.5"
                              title={isVi ? "Sao chép email" : "Copy email"}
                            >
                              {copiedId === member.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Custom Status Quote if present */}
                          {member.statusMessage && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic mt-1 truncate">
                              {member.statusEmoji ? `${member.statusEmoji} ` : ''}"{member.statusMessage}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Department Chip */}
                      <div className="pt-0.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${deptBadge.class}`}>
                          {renderSpaceIcon(deptBadge.icon, "w-3 h-3")}
                          <span>{deptBadge.label}</span>
                        </span>
                      </div>

                      {/* Workload Progress Bar */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Tiến độ việc' : 'Workload'}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 tabular-nums">{completedCount}/{totalCount} {isVi ? 'hoàn thành' : 'done'}</span>
                        </div>

                        {totalCount > 0 ? (
                          <div className="space-y-1">
                            <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  completionRate === 100 
                                    ? 'bg-emerald-500' 
                                    : 'bg-indigo-600 dark:bg-indigo-500'
                                }`} 
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold tabular-nums">
                              <span>{completionRate}%</span>
                              <span className="text-amber-600 dark:text-amber-400">{pendingCount} {isVi ? 'đang làm' : 'pending'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic text-center py-0.5">
                            {isVi ? 'Chưa được phân công việc' : 'No tasks assigned'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Joined Date and Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {isVi ? `Gia nhập ${member.joinedDate || '2026'}` : `Joined ${member.joinedDate || '2026'}`}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {!isCurrentUser && onStartChat && (
                          <button
                            type="button"
                            onClick={() => onStartChat(member.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 dark:bg-indigo-950/60 dark:hover:bg-indigo-600 text-indigo-600 hover:text-white dark:text-indigo-400 dark:hover:text-white border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            title={isVi ? "Nhắn tin trực tiếp" : "Direct Message"}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{isVi ? 'Nhắn tin' : 'Chat'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenDetail(member)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          {isVi ? 'Hồ sơ' : 'Profile'}
                        </button>

                        {isOwner && !isCurrentUser && scopeTab === 'workspace' && member.userId && membershipRoles[member.userId] !== 'owner' && (
                          <button
                            type="button"
                            onClick={() => promptRemoveFromWorkspace(member)}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title={isVi ? "Xoá khỏi workspace" : "Remove from workspace"}
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
          ) : (
            /* D. MEMBERS DISPLAY: TABLE VIEW */
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/70 dark:border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                      <th className="py-3.5 px-5">{isVi ? 'Thành viên' : 'Member'}</th>
                      <th className="py-3.5 px-4">{isVi ? 'Phòng ban' : 'Department'}</th>
                      <th className="py-3.5 px-4">{isVi ? 'Vai trò' : 'Role'}</th>
                      <th className="py-3.5 px-4">{isVi ? 'Trạng thái' : 'Status'}</th>
                      <th className="py-3.5 px-4">{isVi ? 'Tiến độ việc' : 'Tasks'}</th>
                      <th className="py-3.5 px-5 text-right">{isVi ? 'Hành động' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold">
                    {filteredMembers.map((member) => {
                      const memberTasks = workspaceTasks.filter(t => t.assigneeId === member.id || t.assigneeIds?.includes(member.id));
                      const totalCount = memberTasks.length;
                      const completedCount = memberTasks.filter(t => t.status === 'completed').length;
                      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                      const deptBadge = getDeptBadge(member.department, isVi);
                      const isCurrentUser = member.id === 'user' || member.id === me?.id;
                      const roleMeta = roleLabels[member.role] || roleLabels.member;
                      const currentStatus = (member.status || 'offline') as keyof typeof statusColors;

                      return (
                        <tr key={member.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div 
                                className="relative shrink-0 cursor-pointer"
                                onClick={() => handleOpenDetail(member)}
                              >
                                <SignedImage 
                                  filePath={member.avatar} 
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700" 
                                  alt={member.name} 
                                />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${statusColors[currentStatus]}`} />
                              </div>
                              <div className="min-w-0">
                                <h4 
                                  onClick={() => handleOpenDetail(member)}
                                  className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer truncate"
                                >
                                  {member.name}
                                </h4>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[11px] text-slate-400 truncate">{member.email}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyEmail(e, member.id, member.email)}
                                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                    title={isVi ? "Sao chép email" : "Copy email"}
                                  >
                                    {copiedId === member.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border ${deptBadge.class}`}>
                              {renderSpaceIcon(deptBadge.icon, "w-3 h-3")}
                              <span>{deptBadge.label}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleMeta.badge}`}>
                              {roleMeta.text}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                              <span className={`w-1.5 h-1.5 rounded-full ${statusColors[currentStatus]}`} />
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                {statusLabels[currentStatus]}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="w-32 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                                <span>{completedCount}/{totalCount} việc</span>
                                <span>{completionRate}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" 
                                  style={{ width: `${completionRate}%` }} 
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isCurrentUser && onStartChat && (
                                <button
                                  type="button"
                                  onClick={() => onStartChat(member.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                                  title={isVi ? "Nhắn tin" : "Chat"}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(member)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title={isVi ? "Xem chi tiết" : "View profile"}
                              >
                                <Info className="w-4 h-4" />
                              </button>
                              {isOwner && !isCurrentUser && scopeTab === 'workspace' && member.userId && membershipRoles[member.userId] !== 'owner' && (
                                <button
                                  type="button"
                                  onClick={() => promptRemoveFromWorkspace(member)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title={isVi ? "Xoá khỏi workspace" : "Remove"}
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state when no members match */}
          {filteredMembers.length === 0 && (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
              <Users className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {isVi ? 'Không tìm thấy thành viên nào phù hợp' : 'No matching members found'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {isVi ? 'Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc vai trò, phòng ban.' : 'Try adjusting your search query or reset active filters.'}
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {isVi ? 'Đặt lại tất cả bộ lọc' : 'Reset all filters'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. VIEW TAB 2: DEPARTMENTS & SQUADS MANAGEMENT */}
      {teamOSView === 'teams' && (
        <TeamManagement
          teams={dbTeams}
          memberships={dbTeamMembers}
          members={workspaceMembers}
          tasks={workspaceTasks}
          activeWorkspaceId={activeWorkspaceId}
          canManage={Boolean(isOwner)}
          departments={dbDepts}
          onRefresh={fetchHierarchy}
          onAddSyncLog={onAddSyncLog}
        />
      )}

      {/* 5. VIEW TAB 3: ORGANIZATIONAL CHART */}
      {teamOSView === 'org_chart' && (
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-x-auto min-h-[520px] flex flex-col items-center">
          
          <div className="w-full border-b border-slate-100 dark:border-slate-800 pb-5 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider mb-2">
              <GitBranch className="w-3 h-3" />
              <span>{isVi ? `Sơ đồ tổ chức · ${currentWorkspaceName}` : `Organization Hierarchy · ${currentWorkspaceName}`}</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {isVi ? 'Cấu trúc phòng ban và nhóm chuyên môn' : 'Department & Team Squad Hierarchy'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {isVi ? 'Mạng lưới điều hành từ cấp quản lý tới từng squad phụ trách và nhân sự trực thuộc.' : 'Operating tree from leadership down to project squads and specialists.'}
            </p>

            {/* Department Filter Pills */}
            <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setOrgChartDeptFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  orgChartDeptFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isVi ? 'Tất cả phòng ban' : 'All Departments'}
              </button>
              {dbDepts.filter(d => d.parent_id).map(d => {
                const deptBadge = getDeptBadge(d.id, isVi);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setOrgChartDeptFilter(d.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      orgChartDeptFilter === d.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {renderSpaceIcon(deptBadge.icon, "w-3 h-3")}
                    <span>{d.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 space-y-10 w-full max-w-4xl flex flex-col items-center">
            {/* Root Node: Executive HQ */}
            {dbDepts.filter(d => !d.parent_id).map(hq => {
              const manager = workspaceMembers.find(m => m.id === hq.manager_id || (m.id === 'user' && hq.manager_id?.includes('user')));
              return (
                <div key={hq.id} className="flex flex-col items-center space-y-6 w-full">
                  
                  {/* HQ Box */}
                  <div className="relative p-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white rounded-2xl shadow-xl w-80 text-center border border-indigo-400/20 group hover:shadow-indigo-500/20 transition-all">
                    <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[9px] font-black uppercase tracking-wider rounded-md mb-2">
                      {isVi ? 'Văn phòng Điều hành' : 'Executive HQ'}
                    </span>
                    <h3 className="text-base font-black">{hq.name}</h3>
                    <p className="text-[11px] text-indigo-100 mt-1 leading-relaxed">{hq.description}</p>
                    
                    {manager ? (
                      <div 
                        onClick={() => handleOpenDetail(manager)}
                        className="mt-3.5 pt-3 border-t border-white/20 flex items-center gap-2.5 text-left cursor-pointer hover:bg-white/10 p-1.5 rounded-xl transition-colors"
                        title={isVi ? "Xem hồ sơ người phụ trách" : "View director profile"}
                      >
                        <SignedImage 
                          filePath={manager.avatar} 
                          className="w-9 h-9 rounded-full bg-white/10 p-0.5 object-cover border border-white/30" 
                          alt={manager.name} 
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold leading-tight truncate text-white">{manager.name}</p>
                          <span className="text-[9.5px] text-indigo-200 font-medium block">
                            {isVi ? 'Tổng Giám đốc / Trưởng ban điều hành' : 'Executive Director'}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-200 opacity-60 group-hover:opacity-100" />
                      </div>
                    ) : (
                      <div className="mt-3.5 pt-3 border-t border-white/20 text-[10px] text-indigo-200 font-medium">
                        {isVi ? 'Chưa chỉ định người đứng đầu' : 'No director assigned'}
                      </div>
                    )}
                  </div>

                  {/* Vertical connector */}
                  <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-700 relative">
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900" />
                  </div>

                  {/* Child Departments Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-2">
                    {dbDepts
                      .filter(d => d.parent_id === hq.id && (orgChartDeptFilter === 'all' || orgChartDeptFilter === d.id))
                      .map(dept => {
                        const deptTeams = dbTeams.filter(t => t.department_id === dept.id);
                        const deptBadge = getDeptBadge(dept.id, isVi);

                        return (
                          <div key={dept.id} className="flex flex-col items-center space-y-4">
                            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shadow-xs w-64 text-center hover:border-indigo-500/40 transition-all">
                              <div className="flex justify-center mb-1">
                                {renderSpaceIcon(deptBadge.icon, "w-5 h-5 text-indigo-500")}
                              </div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1">{dept.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{dept.description}</p>
                              
                              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold px-1">
                                <span>{deptTeams.length} {isVi ? 'nhóm squad' : 'squads'}</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-black">
                                  {dbTeamMembers.filter(tm => deptTeams.some(dt => dt.id === tm.team_id)).length} {isVi ? 'thành viên' : 'members'}
                                </span>
                              </div>
                            </div>

                            {/* Squads in Department */}
                            {deptTeams.length > 0 ? (
                              <div className="w-full space-y-2">
                                {deptTeams.map(t => {
                                  const teamLead = workspaceMembers.find(m => m.id === t.leader_id || (m.id === 'user' && t.leader_id?.includes('user')));
                                  const squadMemberships = dbTeamMembers.filter(tm => tm.team_id === t.id);
                                  const squadMembers = squadMemberships
                                    .map(tm => workspaceMembers.find(m => m.id === tm.member_id || (m.id === 'user' && tm.member_id?.includes('user'))))
                                    .filter(Boolean) as User[];
                                  const memberCount = squadMemberships.length;

                                  return (
                                    <div 
                                      key={t.id} 
                                      onClick={() => setTeamOSView('teams')}
                                      className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 text-left space-y-2 shadow-2xs hover:border-indigo-400/60 hover:shadow-md transition-all cursor-pointer group"
                                      title={isVi ? "Nhấn để quản lý Squad này" : "Click to manage this squad"}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-xs shrink-0">
                                            {renderSpaceIcon(t.icon || '👥', "w-3.5 h-3.5")}
                                          </span>
                                          <p className="text-xs font-bold text-slate-850 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                            {t.name}
                                          </p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                                          {memberCount}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                        <span className="truncate max-w-32">
                                          {teamLead ? (
                                            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                              <Crown className="w-2.5 h-2.5" /> {teamLead.name}
                                            </span>
                                          ) : (
                                            `${memberCount} ${isVi ? 'thành viên' : 'members'}`
                                          )}
                                        </span>

                                        {/* Avatar preview stack */}
                                        <div className="flex -space-x-1.5 shrink-0">
                                          {squadMembers.slice(0, 3).map(m => (
                                            <SignedImage
                                              key={m.id}
                                              filePath={m.avatar}
                                              className="w-5 h-5 rounded-full object-cover border border-white dark:border-slate-900"
                                              alt={m.name}
                                            />
                                          ))}
                                          {memberCount > 3 && (
                                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[8px] font-black text-slate-500 flex items-center justify-center border border-white dark:border-slate-900">
                                              +{memberCount - 3}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic py-2">
                                {isVi ? 'Chưa có squad' : 'No squads yet'}
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
      )}

      {/* 5. VIEW TAB: CONTACTS & PARTNERS */}
      {teamOSView === 'contacts' && (
        <WorkspaceContactsTab
          workspaceId={activeWorkspaceId}
          currentWorkspaceName={currentWorkspaceName}
          canAdminister={isOwner}
          onAddSyncLog={onAddSyncLog}
        />
      )}

      {/* 6. MEMBER DETAIL DRAWER / MODAL */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setSelectedMember(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative group/avatar cursor-pointer shrink-0">
                    <SignedImage 
                      filePath={selectedMember.avatar} 
                      className="w-13 h-13 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 object-cover" 
                      alt={selectedMember.name} 
                    />
                    <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity">
                      <Upload className="w-4 h-4 text-white" />
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
                      <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight truncate">
                        {selectedMember.name}
                      </h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${roleLabels[selectedMember.role]?.badge || roleLabels.member.badge}`}>
                        {roleLabels[selectedMember.role]?.text || 'Member'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold truncate">
                        {selectedMember.email}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyEmail(e, selectedMember.id, selectedMember.email)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer p-0.5"
                        title={isVi ? "Sao chép email" : "Copy email"}
                      >
                        {copiedId === selectedMember.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Direct Message Button in Modal Header */}
                  {selectedMember.id !== 'user' && selectedMember.id !== me?.id && onStartChat && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = selectedMember.id;
                        setSelectedMember(null);
                        onStartChat(targetId);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title={isVi ? "Nhắn tin trực tiếp" : "Direct Message"}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Nhắn tin' : 'Chat'}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className={`w-2 h-2 rounded-full ${statusColors[(selectedMember.status || 'offline') as keyof typeof statusColors]}`} />
                    <span>{statusLabels[(selectedMember.status || 'offline') as keyof typeof statusLabels]}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-tabs in Details Modal */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 gap-2">
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('overview')}
                  className={`py-3 px-3 text-xs font-bold transition-all relative cursor-pointer select-none flex items-center gap-2 ${
                    detailActiveTab === 'overview'
                      ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-black'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>{isVi ? 'Tổng quan & Công việc' : 'Overview & Tasks'}</span>
                </button>

                {(isOwner || selectedMember.id === me?.id || selectedMember.userId === currentUser?.id) && (
                  <button
                    type="button"
                    onClick={() => setDetailActiveTab('settings')}
                    className={`py-3 px-3 text-xs font-bold transition-all relative cursor-pointer select-none flex items-center gap-2 ${
                      detailActiveTab === 'settings'
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-black'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                    <span>{isVi ? 'Chỉnh sửa hồ sơ' : 'Edit Profile'}</span>
                  </button>
                )}
              </div>

              {/* Modal Body Contents */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {detailActiveTab === 'overview' ? (
                  <div className="space-y-6 text-left">
                    
                    {/* Status Message if present */}
                    {selectedMember.statusMessage && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block mb-1">
                          {isVi ? 'Trạng thái hiện tại' : 'Current Status'}
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1.5">
                          {selectedMember.statusEmoji ? <span>{selectedMember.statusEmoji}</span> : null}
                          <span className="italic">"{selectedMember.statusMessage}"</span>
                        </p>
                      </div>
                    )}

                    {/* Task Stats Row */}
                    {(() => {
                      const memberTasks = workspaceTasks.filter(t => t.assigneeId === selectedMember.id || t.assigneeIds?.includes(selectedMember.id));
                      const totalAssigned = memberTasks.length;
                      const completed = memberTasks.filter(t => t.status === 'completed').length;
                      const ongoing = totalAssigned - completed;
                      const ratio = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
                      
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                            <ClipboardList className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
                            <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{totalAssigned}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">
                              {isVi ? 'Được giao' : 'Assigned'}
                            </span>
                          </div>
                          
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                            <Clock className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                            <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{ongoing}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">
                              {isVi ? 'Đang làm' : 'In Progress'}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                            <UserCheck className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                            <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{completed}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">
                              {isVi ? 'Hoàn thành' : 'Completed'}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                            <Flame className="w-4 h-4 mx-auto text-rose-500 mb-1" />
                            <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{ratio}%</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">
                              {isVi ? 'Tỷ lệ' : 'Rate'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Member Details & Tasks list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Left: Bio, Contact info & Squads */}
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{isVi ? 'Giới thiệu bản thân' : 'Bio'}</span>
                          </h4>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {selectedMember.bio || (isVi ? 'Chưa cập nhật tiểu sử.' : 'No biography updated yet.')}
                          </p>
                        </div>

                        {/* Squads this member belongs to */}
                        {(() => {
                          const memberSquads = dbTeams.filter(team => {
                            const isLead = team.leader_id === selectedMember.id || (selectedMember.id === 'user' && team.leader_id?.includes('user'));
                            const isMember = dbTeamMembers.some(tm => tm.team_id === team.id && (tm.member_id === selectedMember.id || (selectedMember.id === 'user' && tm.member_id?.includes('user'))));
                            return isLead || isMember;
                          });

                          return (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{isVi ? 'Nhóm chuyên môn (Squads)' : 'Team Squads'} ({memberSquads.length})</span>
                              </h4>
                              {memberSquads.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {memberSquads.map(sq => {
                                    const isLead = sq.leader_id === selectedMember.id || (selectedMember.id === 'user' && sq.leader_id?.includes('user'));
                                    return (
                                      <span key={sq.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                                        {renderSpaceIcon(sq.icon || '👥', "w-3 h-3")}
                                        <span>{sq.name}</span>
                                        {isLead && (
                                          <span className="text-[9px] font-black text-amber-500 flex items-center gap-0.5">
                                            <Crown className="w-2.5 h-2.5" /> Lead
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">
                                  {isVi ? 'Chưa tham gia nhóm chuyên môn nào.' : 'Not assigned to any squad yet.'}
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2.5">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                            {isVi ? 'Thông tin liên lạc' : 'Contact Information'}
                          </h4>
                          <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                              <span>{isVi ? 'Phòng ban:' : 'Department:'} <strong>{getDeptBadge(selectedMember.department, isVi).label}</strong></span>
                            </div>
                            {selectedMember.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{isVi ? 'Số điện thoại:' : 'Phone:'} <a href={`tel:${selectedMember.phone}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{selectedMember.phone}</a></span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{isVi ? 'Ngày gia nhập:' : 'Joined:'} <span className="text-slate-400">{selectedMember.joinedDate || '2026'}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Task list with filter */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{isVi ? 'Danh sách công việc' : 'Assigned Tasks'}</span>
                          </h4>

                          {/* Task Filter Tabs */}
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                            {(['all', 'pending', 'completed'] as const).map(f => (
                              <button
                                key={f}
                                type="button"
                                onClick={() => setModalTaskFilter(f)}
                                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                  modalTaskFilter === f
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                              >
                                {f === 'all' ? (isVi ? 'Tất cả' : 'All') : f === 'pending' ? (isVi ? 'Đang làm' : 'Active') : (isVi ? 'Xong' : 'Done')}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                          {(() => {
                            const memberTasks = workspaceTasks.filter(t => t.assigneeId === selectedMember.id || t.assigneeIds?.includes(selectedMember.id));
                            const filteredMemberTasks = memberTasks.filter(t => {
                              if (modalTaskFilter === 'pending') return t.status !== 'completed';
                              if (modalTaskFilter === 'completed') return t.status === 'completed';
                              return true;
                            });

                            if (filteredMemberTasks.length === 0) {
                              return (
                                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 italic text-xs">
                                  {isVi ? 'Không có công việc nào trong danh mục này.' : 'No tasks in this category.'}
                                </div>
                              );
                            }

                            return filteredMemberTasks.map(task => (
                              <div
                                key={task.id}
                                className={`p-3 rounded-xl border text-xs transition-all ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-50/20 border-emerald-200/50 dark:border-emerald-900/40 text-slate-400'
                                    : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`font-bold line-clamp-1 ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                                    {task.title}
                                  </p>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase shrink-0 ${
                                    task.priority === 'urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' :
                                    task.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-1">
                                  <span className="capitalize">{task.status}</span>
                                  {task.dueDate && <span>{isVi ? 'Hạn:' : 'Due:'} {task.dueDate}</span>}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Profile editor tab */
                  <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {isVi ? 'Họ và tên' : 'Full Name'}
                        </label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-slate-900 dark:text-slate-100 font-semibold focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {isVi ? 'Địa chỉ email' : 'Email Address'}
                        </label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          disabled
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none text-slate-400 cursor-not-allowed font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {isVi ? 'Số điện thoại' : 'Phone Number'}
                        </label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="e.g. +84 90 123 4567"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-slate-900 dark:text-slate-100 font-semibold focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {isVi ? 'Phòng ban' : 'Department'}
                        </label>
                        <select
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-slate-900 dark:text-slate-100 font-semibold focus:border-indigo-500 cursor-pointer"
                        >
                          {DEPARTMENTS.map(d => (
                            <option key={d.id} value={d.id}>{isVi ? d.viLabel : d.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {isOwner && membershipRoles[selectedMember.userId || ''] !== 'owner' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {isVi ? 'Vai trò & Phân quyền Workspace' : 'Workspace Role & Permissions'}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { id: 'admin', label: isVi ? 'Quản trị (Admin)' : 'Admin', desc: isVi ? 'Toàn quyền quản lý' : 'Full workspace management' },
                            { id: 'member', label: isVi ? 'Thành viên (Member)' : 'Member', desc: isVi ? 'Truy cập mục công khai' : 'Standard workspace access' },
                            { id: 'guest', label: isVi ? 'Khách (Guest)' : 'Guest', desc: isVi ? 'Chỉ mục được chia sẻ' : 'Invited items only' }
                          ].map(roleOpt => (
                            <button
                              key={roleOpt.id}
                              type="button"
                              onClick={() => setEditRole(roleOpt.id as any)}
                              className={`p-3 text-left rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                editRole === roleOpt.id
                                  ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/40 shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <p className="font-black">{roleOpt.label}</p>
                              <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{roleOpt.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        {isVi ? 'Giới thiệu / Ghi chú' : 'Bio / Notes'}
                      </label>
                      <textarea
                        rows={3}
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder={isVi ? "Viết mô tả ngắn về bản thân..." : "Write a brief note..."}
                        className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>

                    <div className="pt-4 flex items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800">
                      {isOwner && selectedMember.id !== me?.id && selectedMember.userId && membershipRoles[selectedMember.userId] !== 'owner' ? (
                        <button
                          type="button"
                          onClick={() => promptRemoveFromWorkspace(selectedMember)}
                          className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Xóa khỏi Workspace' : 'Remove from Workspace'}</span>
                        </button>
                      ) : <div />}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailActiveTab('overview')}
                          className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          {isVi ? 'Hủy bỏ' : 'Discard'}
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                        >
                          {isVi ? 'Lưu thông tin hồ sơ' : 'Save Profile'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. INVITE MODAL INTEGRATION */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSendInvites={handleSendInvites}
        workspaceName={currentWorkspaceName}
        onOpenManualAdd={() => {
          setShowInviteModal(false);
          setShowManualAddModal(true);
        }}
      />

      {/* 8. MANUAL ADD MEMBER MODAL */}
      <ManualAddMemberModal
        isOpen={showManualAddModal}
        onClose={() => setShowManualAddModal(false)}
        workspaceId={activeWorkspaceId}
        workspaceName={currentWorkspaceName}
        allMembers={members}
        onMemberAdded={() => {
          fetchHierarchy();
        }}
        onAddSyncLog={onAddSyncLog}
      />

      {/* 9. CONFIRM REMOVE MEMBER MODAL */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        title={isVi ? 'Xóa thành viên khỏi Workspace' : 'Remove Member from Workspace'}
        description={isVi 
          ? `Bạn có chắc chắn muốn xóa thành viên "${memberToRemove?.name}" khỏi không gian "${currentWorkspaceName}"? Họ sẽ mất quyền truy cập vào danh mục, dự án và tài liệu của không gian này.`
          : `Are you sure you want to remove "${memberToRemove?.name}" from "${currentWorkspaceName}"? They will lose access to all projects, documents, and tasks in this workspace.`
        }
        itemName={memberToRemove?.name}
        confirmText={isVi ? 'Xóa thành viên' : 'Remove Member'}
        cancelText={isVi ? 'Hủy' : 'Cancel'}
        isDestructive={true}
        type="danger"
        onConfirm={confirmRemoveFromWorkspace}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
}
