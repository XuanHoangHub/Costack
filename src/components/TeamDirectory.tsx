"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Workspace, Task } from '../types';
import { 
  Users, UserPlus, Shield, Sparkles, Mail, Circle,
  Key, Trash2, Globe, HeartHandshake, Compass, Upload,
  Check, ChevronDown, UserMinus, Plus, Info, LayoutGrid,
  Award, Activity, Star, Phone, Search, X, SlidersHorizontal,
  Briefcase, Calendar, CheckSquare, ClipboardList, Flame, Edit, 
  ExternalLink, UserCheck, Clock
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import SignedImage from './SignedImage';
import InviteModal from './InviteModal';

interface TeamDirectoryProps {
  members: User[];
  tasks: Task[];
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onAddMember: (member: Omit<User, 'id'>) => void;
  onUpdateMember: (member: User) => void;
  onDeleteMember: (id: string) => void;
  onAddSyncLog: (action: string) => void;
}

const DEPARTMENTS = [
  { id: 'Technical', label: 'Engineering' },
  { id: 'Design', label: 'Design & Experience' },
  { id: 'Marketing', label: 'Communications & Marketing' },
  { id: 'Business', label: 'Sales & Market (Sales)' },
  { id: 'HR', label: 'Human Resources (HR)' },
  { id: 'Finance', label: 'Finance & Planning' },
];

const getDeptBadge = (deptId?: string) => {
  switch (deptId) {
    case 'Technical': return { label: 'Engineering', icon: '💻', class: 'bg-indigo-50 border-indigo-150 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/30 dark:text-indigo-400' };
    case 'Design': return { label: 'Design', icon: '🎨', class: 'bg-purple-50 border-purple-150 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900/30 dark:text-purple-400' };
    case 'Marketing': return { label: 'Marketing', icon: '📣', class: 'bg-amber-50 border-amber-150 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900/30 dark:text-amber-400' };
    case 'Business': return { label: 'Sales', icon: '📈', class: 'bg-emerald-50 border-emerald-150 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/30 dark:text-emerald-400' };
    case 'HR': return { label: 'HR', icon: '👥', class: 'bg-rose-50 border-rose-150 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/30 dark:text-rose-400' };
    case 'Finance': return { label: 'Finance', icon: '💰', class: 'bg-teal-50 border-teal-150 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/30 dark:text-teal-400' };
    default: return { label: 'General', icon: '🏢', class: 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400' };
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
  onAddSyncLog
}: TeamDirectoryProps) {
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
    setEditDepartment(member.department || 'Technical');
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
    offline: 'bg-slate-400 ring-slate-100 dark:ring-slate-900/40'
  };

  const statusLabelsEng = {
    online: 'Online',
    busy: 'Busy',
    offline: 'Offline'
  };

  const roleLabels = {
    admin: { text: 'Admin', bg: 'bg-indigo-50 border-indigo-200/50 text-indigo-700 dark:bg-indigo-950/35 dark:border-indigo-900/40 dark:text-indigo-400' },
    member: { text: 'Member', bg: 'bg-cyan-50 border-cyan-200/50 text-cyan-700 dark:bg-cyan-950/35 dark:border-cyan-900/40 dark:text-cyan-400' },
    guest: { text: 'Guest / Partner', bg: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400' }
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
    // Keep user's default role to avoid orphaned workspace completely
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

      // Delete older custom avatar if any
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
    const formattedJoinedDate = new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });

    emails.forEach(email => {
      const baseName = email.split('@')[0];
      const name = baseName
        .split(/[._\-+]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Map role. If the chosen role is custom or limited, cast/map to guest or use directly if valid.
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
        department: 'Technical',
        bio: 'No biography updated yet.',
        joinedDate: formattedJoinedDate,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        role: finalRole,
        status: 'online',
        workspaceIds: [activeWorkspaceId]
      });

    });
  };

  const handleToggleStatus = (member: User) => {
    const statuses: ('online' | 'busy' | 'offline')[] = ['online', 'busy', 'offline'];
    const nextIdx = (statuses.indexOf(member.status) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    const updatedUser = {
      ...member,
      status: nextStatus
    };

    onUpdateMember(updatedUser);

    if (selectedMember?.id === member.id) {
      setSelectedMember(updatedUser);
    }

    onAddSyncLog(`Quick changed ${member.name}'s status to ${nextStatus.toUpperCase()}`);
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
                Project & Staff Allocation System
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-550 font-medium leading-relaxed max-w-2xl">
                Query roles, specialist access, balance workloads evenly, and monitor project stamina across the multi-workspace database.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick enroll button if we are on the current workspace tab */}
          {activeTab === 'workspace' && membersAvailableToEnroll.length > 0 && (
            <div className="relative">
              <button
                id="btn_enroll_existing"
                onClick={() => setShowAddExistingDropdown(!showAddExistingDropdown)}
                className="py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-200 border border-slate-250 dark:border-slate-800 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none"
              >
                <Plus className="w-4 h-4 text-slate-500" />
                <span>Assign Staff</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <AnimatePresence>
                {showAddExistingDropdown && (
                  <>
                    {/* Click outside overlay */}
                    <div 
                      className="fixed inset-0 z-20 cursor-default" 
                      onClick={() => setShowAddExistingDropdown(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-2 overflow-hidden"
                    >
                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                      Chọn nhân sự tổ chức tham gia {currentWorkspaceName}
                    </div>
                    <div className="max-h-52 overflow-y-auto custom-scrollbar p-1 space-y-1 mt-1">
                      {membersAvailableToEnroll.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleEnrollExisting(m)}
                          className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <SignedImage 
                            filePath={m.avatar} 
                            className="w-7 h-7 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                            alt={m.name}
                            fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.name)}`}
                          />
                          <div className="min-w-0">
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
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-650 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer self-start lg:self-auto hover:shadow-indigo-500/10"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add / Invite Staff</span>
          </button>
        </div>
      </div>

      {/* Bento-style Workspace Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-xs flex items-center justify-between transition-colors">
          <div className="space-y-1">
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
          <div className="space-y-1">
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
          <div className="space-y-1">
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
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-605 dark:border-indigo-400 font-black' 
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
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-605 dark:border-indigo-400 font-black' 
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-550 dark:hover:text-slate-350'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>All Org Directory ({members.length})</span>
          </button>
        </div>

        {/* Total stats matching list */}
        <div className="text-[11px] px-3 pb-2 sm:pb-0 text-slate-400 dark:text-slate-550 font-bold italic">
          Showing {filteredMembers.length} matching colleagues
        </div>
      </div>

      {/* 🔍 SEARCH AND ADVANCED DROPDOWN FILTERS AREA */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center gap-3">
        {/* Instant Search Bar */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input
            id="team_search_input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, skills, phone, biography..."
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

        {/* Dropdown filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Department Filter */}
          <select
            id="team_filter_dept"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-xs font-bold border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 cursor-pointer outline-none focus:border-indigo-505 focus:ring-2 focus:ring-indigo-500/10"
          >
            <option value="all">📁 All Departments</option>
            {DEPARTMENTS.map(d => (
              <option key={d.id} value={d.id}>{d.label.split(' (')[0]}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            id="team_filter_role"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-xs font-bold border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 cursor-pointer outline-none focus:border-indigo-505 focus:ring-2 focus:ring-indigo-500/10"
          >
            <option value="all">🛡️ All Roles</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="guest">Guest / Secretary</option>
          </select>

          {/* Status Filter */}
          <select
            id="team_filter_status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-bold border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 cursor-pointer outline-none focus:border-indigo-505 focus:ring-2 focus:ring-indigo-500/10"
          >
            <option value="all">🟢 All Statuses</option>
            <option value="online">Online</option>
            <option value="busy">Busy (Meetings)</option>
            <option value="offline">Offline</option>
          </select>

          {/* Reset Filters button if active */}
          {(searchQuery || filterRole !== 'all' || filterStatus !== 'all' || filterDept !== 'all') && (
            <button
              onClick={clearAllFilters}
              className="py-2 px-3 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer flex items-center gap-1 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Members Directory Grid Card Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredMembers.map((member) => {
              const memberWorkspaces = workspaces.filter(w => member.workspaceIds?.includes(w.id));
              const deptBadge = getDeptBadge(member.department);

              // Calculate active task statistics
              const memberTasks = tasks.filter(t => t.assigneeId === member.id);
              const totalTaskCount = memberTasks.length;
              const completedTaskCount = memberTasks.filter(t => t.status === 'completed').length;
              const pendingTaskCount = totalTaskCount - completedTaskCount;
              const completionPercent = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;
              
              return (
                <motion.div
                  layout
                  key={member.id}
                  id={`member_card_${member.id}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="group relative p-5.5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/65 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.06)] dark:hover:shadow-[0_20px_50px_rgba(99,102,241,0.12)] hover:border-indigo-500/25 dark:hover:border-indigo-400/25 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle colorful back glow on hover */}
                  <div className="absolute -inset-px bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div className="space-y-4 relative z-10">
                    
                    {/* Status Pill & Role Badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider select-none shadow-3xs ${roleLabels[member.role].bg}`}>
                          {roleLabels[member.role].text}
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleStatus(member)}
                        className="p-1 px-2.5 bg-slate-50/80 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-full transition-all border border-slate-200/60 dark:border-slate-800/60 cursor-pointer flex items-center gap-1.5 shadow-3xs"
                        title="Quick Change Status"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${statusColors[member.status]} shrink-0 shadow-xs`} />
                        <span className="text-[10px] text-slate-550 dark:text-slate-400 font-bold select-none whitespace-nowrap">
                          {statusLabelsEng[member.status]}
                        </span>
                      </button>
                    </div>

                    {/* Member Core Info (Avatar, Name, Email) */}
                    <div className="flex items-center gap-3.5 pt-1.5">
                      <div className="relative group/avatar cursor-pointer">
                        <SignedImage 
                          filePath={member.avatar} 
                          className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-850 border-2 border-slate-200 dark:border-slate-800 group-hover/avatar:border-indigo-500/40 p-0.5 object-cover shrink-0 select-none group-hover/avatar:brightness-90 transition-all duration-300 ring-4 ring-indigo-500/0 group-hover/avatar:ring-indigo-500/10" 
                          alt={member.name} 
                          fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(member.name)}`}
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
                      <div className="min-w-0" onClick={() => handleOpenDetail(member)}>
                        <h4 className="font-extrabold text-slate-850 dark:text-slate-50 text-sm leading-snug truncate group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1">
                          <span>{member.name}</span>
                        </h4>
                        <span className="text-[10px] text-slate-405 dark:text-slate-500 font-semibold block truncate leading-relaxed">{member.email}</span>
                        {member.phone && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-450 block truncate font-medium mt-px">{member.phone}</span>
                        )}
                      </div>
                    </div>

                    {/* Department badge indicator */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550">Department:</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-3xs ${deptBadge.class}`}>
                        <span>{deptBadge.icon}</span>
                        <span>{deptBadge.label}</span>
                      </span>
                    </div>

                    {/* Task workload meter */}
                    <div className="bg-slate-50/40 dark:bg-slate-950/30 p-3 border border-slate-200/35 dark:border-slate-800/40 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400 dark:text-slate-550 block">Task Progress</span>
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
                          <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-550 font-semibold">
                            <span>Completed: {completionPercent}%</span>
                            <span className="text-amber-600 dark:text-amber-455 font-bold">{pendingTaskCount} pending</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 dark:text-slate-550 italic font-medium py-0.5 text-center">
                          No tasks assigned
                        </div>
                      )}
                    </div>

                    {/* Allocated Workspaces indicators */}
                    <div className="space-y-1.5 px-0.5">
                      <span className="text-[9px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-550">
                        Assigned Spaces ({memberWorkspaces.length})
                      </span>
                      <div className="flex flex-wrap gap-1 pt-0.5 select-none">
                        {memberWorkspaces.length > 0 ? (
                          memberWorkspaces.map(ws => (
                            <span
                              key={ws.id}
                              className={`text-[8.5px] font-black px-1.5 py-0.5 rounded border inline-block tracking-wide transition-colors ${
                                ws.id === activeWorkspaceId
                                  ? 'bg-indigo-50/80 border-indigo-200/60 text-indigo-750 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-305'
                                  : 'bg-slate-50/60 border-slate-200/40 text-slate-500 dark:bg-slate-850/40 dark:border-slate-800/65 dark:text-slate-400'
                              }`}
                            >
                              {ws.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] italic text-slate-400 dark:text-slate-550 font-medium">Not in any workspace</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Profile Cards Footer Buttons */}
                  <div className="pt-4 mt-4 border-t border-slate-150 dark:border-slate-800/80 flex flex-col gap-2 w-full relative z-10">
                    {/* Primary profiling click */}
                    <button
                      onClick={() => handleOpenDetail(member)}
                      className="w-full py-2 bg-gradient-to-r from-slate-50 to-slate-100/50 hover:from-indigo-50 hover:to-indigo-100/30 hover:text-indigo-650 dark:from-slate-850 dark:to-slate-850/50 dark:hover:from-slate-800 dark:hover:to-slate-800/40 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-350 text-[11px] font-extrabold rounded-xl border border-slate-200 dark:border-slate-850 flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer shadow-xs select-none hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Details & Tasks</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      {activeTab === 'workspace' && member.id !== 'user' ? (
                        <button
                          onClick={() => handleRemoveFromWorkspace(member)}
                          className="py-1.5 px-1.5 bg-rose-50/55 hover:bg-rose-105 text-rose-600 dark:bg-rose-955/10 dark:hover:bg-rose-950/20 dark:text-rose-400 text-[10px] font-black rounded-lg border border-rose-200/30 transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
                          title="Leave this project / workspace"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span className="truncate">Remove from space</span>
                        </button>
                      ) : (
                        <div className="bg-slate-50/20 dark:bg-slate-850/10 border border-transparent rounded-lg py-1.5 text-center text-[10px] text-slate-400 italic">
                          Default
                        </div>
                      )}

                      {/* Force complete organizational revoke for managers */}
                      {member.id !== 'user' ? (
                        <button
                          id={`btn_delete_member_${member.id}`}
                          onClick={async () => {
                            (window as any).playSystemSound?.('delete');
                            if (confirm(`Are you sure you want to suspend this account and revoke system access for ${member.name}?`)) {
                              if (member.avatar && !member.avatar.startsWith('http')) {
                                try {
                                  await supabase.storage.from('avatars').remove([member.avatar]);
                                } catch (err) {
                                  console.error('Error deleting avatar:', err);
                                }
                              }
                              onDeleteMember(member.id);
                              onAddSyncLog(`Suspended staff account: ${member.name}.`);
                            }
                          }}
                          className="py-1.5 px-1.5 bg-slate-50 hover:bg-red-50 hover:text-red-650 dark:bg-slate-855 dark:hover:bg-red-950/10 dark:hover:text-red-400 text-slate-505 dark:text-slate-400 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
                          title="Revoke membership and access keys"
                        >
                          <Trash2 className="w-3" />
                          <span className="truncate">Revoke Access</span>
                        </button>
                      ) : (
                        <div className="py-1.5 px-1.5 bg-indigo-50/30 dark:bg-indigo-950/10 text-indigo-500 text-[9px] font-black tracking-wide uppercase flex items-center justify-center gap-1 rounded-lg border border-transparent">
                          <Check className="w-3 h-3" />
                          <span>Root Admin</span>
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-14 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 transition-all space-y-4">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-850 rounded-full flex items-center justify-center mx-auto text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <p className="text-slate-800 dark:text-slate-100 font-extrabold text-sm tracking-tight">No matching colleagues found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold max-w-md mx-auto">
              No members match the search query or active filter settings. Try expanding your filters or invite a new member.
            </p>
          </div>
          <button
            onClick={clearAllFilters}
            className="py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-150 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Clear Filters</span>
          </button>
        </div>
      )}

      {/* 👑 COLLEAGUE INTERACTIVE DETAILS DIALOG/DRAWER */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMember(null)}
            className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col max-h-[90vh] md:max-h-[85vh] cursor-default font-sans relative"
            >
              {/* Header section with cover gradient */}
              <div className="relative bg-gradient-to-r from-indigo-650/15 via-purple-500/10 to-cyan-550/15 p-7 border-b border-slate-200/65 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-5 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />
                <div className="flex items-center gap-4">
                  {/* Big avatar preview with file uploads hooks */}
                  <div className="relative w-18 h-18 rounded-full overflow-hidden border-2 border-white dark:border-slate-850 shadow-md aspect-square shrink-0 group/modal-avatar ring-4 ring-indigo-500/10">
                    <SignedImage
                      filePath={selectedMember.avatar}
                      className="w-full h-full object-cover"
                      alt={selectedMember.name}
                      fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(selectedMember.name)}`}
                    />
                    <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-[8px] font-black cursor-pointer transition-opacity leading-none text-center">
                      <span>UPLOAD PHOTO</span>
                      <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarUpload(selectedMember, e)}
                      />
                    </label>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-850 dark:text-slate-50 text-base leading-tight">
                        {selectedMember.name}
                      </h3>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border antialiased ${roleLabels[selectedMember.role].bg}`}>
                        {roleLabels[selectedMember.role].text}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">{selectedMember.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Status:</span>
                  <button
                    onClick={() => handleToggleStatus(selectedMember)}
                    className="py-1.5 px-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 select-none flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusColors[selectedMember.status]}`} />
                    <span>{statusLabelsEng[selectedMember.status]}</span>
                  </button>
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
                      ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-605 dark:border-indigo-400'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Overview & Tasks</span>
                </button>
                <button
                  onClick={() => setDetailActiveTab('settings')}
                  className={`py-3.5 px-4 text-xs font-black transition-all relative cursor-pointer select-none flex items-center gap-2 ${
                    detailActiveTab === 'settings'
                      ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-605 dark:border-indigo-400'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
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
                    {/* Key stats widgets row */}
                    {(() => {
                      const memberTasks = tasks.filter(t => t.assigneeId === selectedMember.id);
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
                        <div className="space-y-1.5 p-4 bg-slate-50/40 dark:bg-slate-850/20 border border-slate-150 dark:border-slate-800/80 rounded-2xl">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Short Bio / Intro</span>
                          </h4>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {selectedMember.bio || 'This member is busy building things and has not written a bio yet.'}
                          </p>
                        </div>

                        <div className="space-y-1.5 p-4 bg-slate-50/40 dark:bg-slate-850/20 border border-slate-150 dark:border-slate-800/80 rounded-2xl">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Office Details</h4>
                          <div className="space-y-2 text-xs font-semibold text-slate-750 dark:text-slate-350">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-slate-400" />
                              <span>Department: <strong>{getDeptBadge(selectedMember.department).label}</strong></span>
                            </div>
                            {selectedMember.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <span>Phone: <a href={`tel:${selectedMember.phone}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{selectedMember.phone}</a></span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>Joined Date: <span className="text-slate-500">{selectedMember.joinedDate || '2026'}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Tasks distribution list */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-554" />
                          <span>Task List ({tasks.filter(t => t.assigneeId === selectedMember.id).length})</span>
                        </h4>
                        
                        <div className="max-h-64 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                          {(() => {
                            const memberTasks = tasks.filter(t => t.assigneeId === selectedMember.id);
                            if (memberTasks.length === 0) {
                              return (
                                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 italic text-[11px] font-medium">
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
                                <div className="flex items-center justify-between text-[10px] font-bold mt-1.5 text-slate-400">
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
                  <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wider font-sans">Full Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none dark:text-slate-50 transition-all font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          disabled={selectedMember.id === 'user'}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none dark:text-slate-50 transition-all font-semibold disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Office Phone</label>
                        <input
                          type="text"
                          placeholder="e.g. +84 901 234 567"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none dark:text-slate-50 transition-all font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Department</label>
                        <select
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value)}
                          className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none dark:text-slate-50 transition-all font-semibold"
                        >
                          {DEPARTMENTS.map(d => (
                            <option key={d.id} value={d.id}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Access Role</label>
                      <select
                        value={editRole}
                        disabled={selectedMember.id === 'user'}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none dark:text-slate-50 transition-all font-semibold disabled:opacity-50"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="guest">Guest / Partner (Guest/Auditor)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Short Biography</label>
                      <textarea
                        rows={3}
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Describe skills, goals, or bio..."
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/85 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none dark:text-slate-50 transition-all font-medium custom-scrollbar"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-805 flex justify-end">
                      <button
                        type="submit"
                        className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all hover:shadow-indigo-500/10"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Member Popup Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSendInvites={handleSendInvites}
      />

    </div>
  );
}
