"use client";

import React, { useMemo, useState } from 'react';
import {
  Building2, Check, ChevronDown, ChevronRight, Crown, Edit3,
  Loader2, Plus, Search, ShieldCheck, Smile, Sparkles, Trash2,
  UserCheck, UserPlus, Users, X
} from 'lucide-react';
import { Task, User } from '@/types';
import { supabase } from '@/supabaseClient';
import SignedImage from '../SignedImage';
import EmojiIconPicker, { renderSpaceIcon } from '../EmojiIconPicker';
import { useTranslation } from '@/contexts/TranslationContext';
import ConfirmModal from '../ConfirmModal';

export interface TeamRow {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  department_id?: string | null;
  leader_id?: string | null;
  announcement?: string | null;
  created_at?: string;
}

export interface TeamMemberRow {
  id?: string | number;
  team_id: string;
  member_id: string;
  role?: 'lead' | 'member';
}

export interface DepartmentRow {
  id: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  manager_id?: string | null;
}

interface TeamManagementProps {
  teams: TeamRow[];
  memberships: TeamMemberRow[];
  members: User[];
  tasks: Task[];
  activeWorkspaceId: string;
  canManage: boolean;
  departments: DepartmentRow[];
  onRefresh: () => Promise<void>;
  onAddSyncLog: (action: string) => void;
}

const TEAM_SUGGESTIONS = [
  { name: 'Product Design', icon: '🎨', description: 'Thiết kế trải nghiệm người dùng, UI/UX và Design System' },
  { name: 'Core Engineering', icon: '💻', description: 'Phát triển kiến trúc backend, frontend và hạ tầng kỹ thuật' },
  { name: 'Growth Marketing', icon: '📣', description: 'Chiến dịch tiếp thị, thu hút người dùng và tăng trưởng doanh thu' },
  { name: 'Customer Success', icon: '🎯', description: 'Hỗ trợ khách hàng, nâng cao trải nghiệm và giữ chân người dùng' },
  { name: 'Operations & HR', icon: '💼', description: 'Vận hành tổ chức, tuyển dụng và phát triển văn hóa doanh nghiệp' },
];

export default function TeamManagement({
  teams, memberships, members, tasks, activeWorkspaceId, canManage,
  departments, onRefresh, onAddSyncLog,
}: TeamManagementProps) {
  const { isVietnamese } = useTranslation();
  const [query, setQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<TeamRow | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [modalMemberSearch, setModalMemberSearch] = useState('');
  const [showAddMembersInModal, setShowAddMembersInModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: '👥',
    leaderId: '',
    departmentId: '',
    selectedMemberIds: [] as string[],
  });

  const workspaceTeams = teams.filter(team => !team.workspace_id || team.workspace_id === activeWorkspaceId);
  const filteredTeams = workspaceTeams.filter(team =>
    `${team.name} ${team.description || ''}`.toLowerCase().includes(query.toLowerCase())
  );
  const selectedTeam = workspaceTeams.find(team => team.id === selectedTeamId) || null;
  const selectedMemberships = selectedTeam
    ? memberships.filter(item => item.team_id === selectedTeam.id)
    : [];
  const selectedMemberIds = new Set(selectedMemberships.map(item => item.member_id));
  const selectedMembers = members.filter(member => selectedMemberIds.has(member.id));

  const stats = useMemo(() => {
    const assignedMemberIds = new Set(memberships.map(item => item.member_id));
    return {
      teams: workspaceTeams.length,
      assigned: members.filter(member => assignedMemberIds.has(member.id)).length,
      unassigned: members.filter(member => !assignedMemberIds.has(member.id)).length,
    };
  }, [members, memberships, workspaceTeams.length]);

  const openCreate = () => {
    setEditingTeam(null);
    setForm({
      name: '',
      description: '',
      icon: '👥',
      leaderId: '',
      departmentId: departments.find(department => department.parent_id)?.id || '',
      selectedMemberIds: [],
    });
    setModalMemberSearch('');
    setShowAddMembersInModal(false);
    setError('');
    setShowEditor(true);
  };

  const openEdit = (team: TeamRow) => {
    setEditingTeam(team);
    const existingMemberIds = memberships
      .filter(item => item.team_id === team.id)
      .map(item => item.member_id);
    setForm({
      name: team.name,
      description: team.description || '',
      icon: team.icon || '👥',
      leaderId: team.leader_id || '',
      departmentId: team.department_id || '',
      selectedMemberIds: existingMemberIds,
    });
    setModalMemberSearch('');
    setShowAddMembersInModal(false);
    setError('');
    setShowEditor(true);
  };

  const toggleMemberInForm = (memberId: string) => {
    setForm(prev => {
      const exists = prev.selectedMemberIds.includes(memberId);
      return {
        ...prev,
        selectedMemberIds: exists
          ? prev.selectedMemberIds.filter(id => id !== memberId)
          : [...prev.selectedMemberIds, memberId],
      };
    });
  };

  const saveTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name || !canManage) return;
    if (workspaceTeams.some(team => team.id !== editingTeam?.id && team.name.toLowerCase() === name.toLowerCase())) {
      setError(isVietnamese ? 'Tên Team đã tồn tại trong workspace.' : 'Team name already exists in workspace.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const targetTeamId = editingTeam?.id || `team-${crypto.randomUUID()}`;
      const { data: { session } } = await supabase.auth.getSession();
      const databaseMemberId = form.leaderId === 'user' && session?.user
        ? `user-${session.user.id}`
        : form.leaderId;

      const teamObj: TeamRow = {
        id: targetTeamId,
        workspace_id: activeWorkspaceId,
        name,
        description: form.description.trim(),
        icon: form.icon,
        department_id: form.departmentId || null,
        leader_id: databaseMemberId || null,
        created_at: editingTeam?.created_at || new Date().toISOString()
      };

      // Always update local cache for teams
      if (typeof window !== 'undefined') {
        try {
          const cached = JSON.parse(localStorage.getItem(`apexa_teams_${activeWorkspaceId}`) || '[]');
          const updated = cached.some((t: any) => t.id === targetTeamId)
            ? cached.map((t: any) => t.id === targetTeamId ? teamObj : t)
            : [...cached, teamObj];
          localStorage.setItem(`apexa_teams_${activeWorkspaceId}`, JSON.stringify(updated));
        } catch (_) {}
      }

      // Upsert team
      try {
        await supabase.rpc('upsert_workspace_team', {
          p_team_id: targetTeamId,
          p_workspace_id: activeWorkspaceId,
          p_name: name,
          p_description: form.description.trim(),
          p_icon: form.icon,
          p_department_id: form.departmentId || null,
          p_leader_id: databaseMemberId || null,
        });
      } catch (cloudErr) {
        console.warn('Cloud sync team fallback to local:', cloudErr);
      }

      // Sync members chosen in form
      const finalMemberIds = new Set(form.selectedMemberIds);
      if (form.leaderId) finalMemberIds.add(form.leaderId);

      if (typeof window !== 'undefined') {
        try {
          const cachedMembers: TeamMemberRow[] = JSON.parse(localStorage.getItem(`apexa_team_members_${activeWorkspaceId}`) || '[]');
          const otherMembers = cachedMembers.filter(m => m.team_id !== targetTeamId);
          const newMembers: TeamMemberRow[] = Array.from(finalMemberIds).map(mId => ({
            id: `tm_${targetTeamId}_${mId}`,
            team_id: targetTeamId,
            member_id: mId,
            role: mId === form.leaderId ? 'lead' : 'member',
          }));
          localStorage.setItem(`apexa_team_members_${activeWorkspaceId}`, JSON.stringify([...otherMembers, ...newMembers]));
        } catch (_) {}
      }

      // Async batch enroll in Supabase
      for (const mId of Array.from(finalMemberIds)) {
        const dbMId = mId === 'user' && session?.user ? `user-${session.user.id}` : mId;
        try {
          await supabase.rpc('set_workspace_team_member', {
            p_team_id: targetTeamId,
            p_member_id: dbMId,
            p_action: 'add',
          });
        } catch (_) {}
      }

      await onRefresh();
      setSelectedTeamId(targetTeamId);
      onAddSyncLog(editingTeam 
        ? (isVietnamese ? `Đã cập nhật Team “${name}”` : `Updated team "${name}"`)
        : (isVietnamese ? `Đã tạo Team “${name}”` : `Created team "${name}"`));
      setShowEditor(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : (isVietnamese ? 'Không thể lưu Team.' : 'Could not save team.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete || !canManage) return;
    const team = teamToDelete;
    setTeamToDelete(null);
    setError('');

    // Update local cache
    if (typeof window !== 'undefined') {
      try {
        const cachedTeams = JSON.parse(localStorage.getItem(`apexa_teams_${activeWorkspaceId}`) || '[]');
        localStorage.setItem(`apexa_teams_${activeWorkspaceId}`, JSON.stringify(cachedTeams.filter((t: any) => t.id !== team.id)));

        const cachedMembers = JSON.parse(localStorage.getItem(`apexa_team_members_${activeWorkspaceId}`) || '[]');
        localStorage.setItem(`apexa_team_members_${activeWorkspaceId}`, JSON.stringify(cachedMembers.filter((m: any) => m.team_id !== team.id)));
      } catch (_) {}
    }

    try {
      await supabase.rpc('delete_workspace_team', { p_team_id: team.id });
    } catch (cloudErr) {
      console.warn('Cloud sync delete fallback to local:', cloudErr);
    }

    await onRefresh();
    if (selectedTeamId === team.id) setSelectedTeamId(null);
    (window as any).playSystemSound?.('delete');
    onAddSyncLog(isVietnamese ? `Đã xóa Team “${team.name}”` : `Deleted team "${team.name}"`);
  };

  const addMember = async (member: User) => {
    if (!selectedTeam || !canManage || selectedMemberIds.has(member.id)) return;
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const databaseMemberId = member.id === 'user' && session?.user ? `user-${session.user.id}` : member.id;

    // Update local cache
    if (typeof window !== 'undefined') {
      try {
        const cachedMembers = JSON.parse(localStorage.getItem(`apexa_team_members_${activeWorkspaceId}`) || '[]');
        const newMemberRow: TeamMemberRow = {
          id: `tm_${Date.now()}`,
          team_id: selectedTeam.id,
          member_id: member.id,
          role: 'member',
        };
        localStorage.setItem(`apexa_team_members_${activeWorkspaceId}`, JSON.stringify([...cachedMembers, newMemberRow]));
      } catch (_) {}
    }

    try {
      await supabase.rpc('set_workspace_team_member', {
        p_team_id: selectedTeam.id,
        p_member_id: databaseMemberId,
        p_action: 'add',
      });
    } catch (cloudErr) {
      console.warn('Cloud sync add member fallback to local:', cloudErr);
    }

    await onRefresh();
    onAddSyncLog(isVietnamese ? `Đã thêm ${member.name} vào Team “${selectedTeam.name}”` : `Added ${member.name} to team "${selectedTeam.name}"`);
  };

  const removeMember = async (member: User) => {
    if (!selectedTeam || !canManage) return;
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const databaseMemberId = member.id === 'user' && session?.user ? `user-${session.user.id}` : member.id;

    // Update local cache
    if (typeof window !== 'undefined') {
      try {
        const cachedMembers = JSON.parse(localStorage.getItem(`apexa_team_members_${activeWorkspaceId}`) || '[]');
        localStorage.setItem(`apexa_team_members_${activeWorkspaceId}`, JSON.stringify(cachedMembers.filter((m: any) => !(m.team_id === selectedTeam.id && (m.member_id === member.id || m.member_id === databaseMemberId)))));
      } catch (_) {}
    }

    try {
      await supabase.rpc('set_workspace_team_member', {
        p_team_id: selectedTeam.id,
        p_member_id: databaseMemberId,
        p_action: 'remove',
      });
    } catch (cloudErr) {
      console.warn('Cloud sync remove member fallback to local:', cloudErr);
    }

    await onRefresh();
    onAddSyncLog(isVietnamese ? `Đã đưa ${member.name} khỏi Team “${selectedTeam.name}”` : `Removed ${member.name} from team "${selectedTeam.name}"`);
  };

  const teamMetrics = (team: TeamRow) => {
    const ids = new Set(memberships.filter(item => item.team_id === team.id).map(item => item.member_id));
    const teamTasks = tasks.filter(task => ids.has(task.assigneeId || '') || task.assigneeIds?.some(id => ids.has(id)));
    const done = teamTasks.filter(task => task.status === 'completed').length;
    return { memberCount: ids.size, open: teamTasks.length - done, completion: teamTasks.length ? Math.round(done / teamTasks.length * 100) : 0 };
  };

  const availableMembers = members.filter(member =>
    !selectedMemberIds.has(member.id) &&
    `${member.name} ${member.email}`.toLowerCase().includes(memberQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Hub Bar */}
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-slate-900/80 p-5 md:p-6 shadow-xs backdrop-blur-md dark:border-slate-800/80 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/25">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{isVietnamese ? 'Trung tâm Quản lý Nhóm' : 'Team Management Hub'}</h3>
              <p className="text-[11px] font-medium text-slate-400">{isVietnamese ? 'Tạo nhóm chức năng, squad hoặc ban dự án từ thành viên trong workspace.' : 'Create functional teams, squads, or project groups from workspace members.'}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={isVietnamese ? "Tìm Team..." : "Search teams..."}
              className="w-56 rounded-2xl border border-slate-200/80 bg-slate-50/80 py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white shadow-2xs transition-all"
            />
          </div>
          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4.5 py-2 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 transition-all hover:scale-103 active:scale-97 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isVietnamese ? 'Tạo Team mới' : 'Create Team'}</span>
            </button>
          )}
        </div>
      </section>

      {/* Quick Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[
          [isVietnamese ? 'Tổng số Team' : 'Total Teams', stats.teams, 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-900/50'],
          [isVietnamese ? 'Đã vào Team' : 'Assigned Staff', stats.assigned, 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/50'],
          [isVietnamese ? 'Chưa phân nhóm' : 'Unassigned Staff', stats.unassigned, 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/50']
        ].map(([label, value, colorClass]) => (
          <div key={label as string} className="rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-slate-900/80 p-5 shadow-xs backdrop-blur-md dark:border-slate-800/80 flex items-center justify-between transition-all hover:-translate-y-0.5">
            <div className="text-left space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans tabular-nums">{value}</p>
            </div>
            <div className={`p-3 rounded-2xl border shadow-2xs ${colorClass}`}>
              <Users className="h-5 w-5" />
            </div>
          </div>
        ))}
      </section>

      {!canManage && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400 shadow-2xs">
          <ShieldCheck className="h-4 w-4 shrink-0" /> {isVietnamese ? 'Chỉ Owner và Admin mới có quyền tạo Team hoặc quản lý thành viên.' : 'Only Owners and Admins have permission to create teams or manage memberships.'}
        </div>
      )}
      {error && !showEditor && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Teams Cards Grid */}
      {filteredTeams.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeams.map(team => {
            const metric = teamMetrics(team);
            const teamMemberIds = memberships.filter(item => item.team_id === team.id).map(item => item.member_id);
            const teamMembers = members.filter(member => teamMemberIds.includes(member.id));
            const leader = members.find(member => member.id === team.leader_id);
            return (
              <article
                key={team.id}
                className="group relative rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-slate-900/80 p-5.5 transition-all duration-300 hover:border-indigo-400/40 dark:hover:border-indigo-500/40 hover:shadow-xl dark:border-slate-800/80 backdrop-blur-md flex flex-col justify-between hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute -inset-px bg-gradient-to-br from-indigo-500/5 via-cyan-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => setSelectedTeamId(team.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-2xl dark:bg-indigo-950/50 border border-indigo-100/80 dark:border-indigo-900/60 shadow-2xs group-hover:scale-105 transition-transform">
                        {renderSpaceIcon(team.icon || '👥', "w-6 h-6")}
                      </span>
                      <span className="min-w-0 text-left">
                        <span className="block truncate text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {team.name}
                        </span>
                        <span className="mt-0.5 block line-clamp-1 text-[11px] font-medium text-slate-400">
                          {team.description || (isVietnamese ? 'Chưa có mô tả' : 'No description')}
                        </span>
                      </span>
                    </button>
                    {canManage && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openEdit(team)} className="rounded-xl p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer" title={isVietnamese ? 'Chỉnh sửa' : 'Edit'}>
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setTeamToDelete(team)} className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition-colors cursor-pointer" title={isVietnamese ? 'Xóa' : 'Delete'}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={() => setSelectedTeamId(team.id)} className="mt-5 w-full text-left cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {teamMembers.slice(0, 5).map(member => (
                          <SignedImage key={member.id} filePath={member.avatar} alt={member.name} className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-xs dark:border-slate-900" />
                        ))}
                        {metric.memberCount === 0 && (
                          <span className="flex h-8 items-center rounded-full border border-dashed border-slate-300 px-3 text-[10px] font-bold text-slate-400 dark:border-slate-700">{isVietnamese ? 'Chưa có thành viên' : 'No members'}</span>
                        )}
                        {metric.memberCount > 5 && (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-black text-slate-600 dark:border-slate-900 dark:bg-slate-800 shadow-xs">
                            +{metric.memberCount - 5}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>{isVietnamese ? 'Chi tiết' : 'View'}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    {leader && (
                      <div className="mt-3.5 flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-1.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40">
                        <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">{isVietnamese ? 'Leader' : 'Lead'}:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-extrabold truncate">{leader.name}</span>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-center">
                      <div className="p-1.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                        <p className="text-sm font-black text-slate-900 dark:text-white font-sans tabular-nums">{metric.memberCount}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{isVietnamese ? 'Thành viên' : 'Members'}</p>
                      </div>
                      <div className="p-1.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                        <p className="text-sm font-black text-slate-900 dark:text-white font-sans tabular-nums">{metric.open}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{isVietnamese ? 'Việc mở' : 'Open Tasks'}</p>
                      </div>
                      <div className="p-1.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-sans tabular-nums">{metric.completion}%</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{isVietnamese ? 'Xong' : 'Done'}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center dark:border-slate-700 dark:bg-slate-900/30">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">{query ? (isVietnamese ? 'Không tìm thấy Team' : 'No teams found') : (isVietnamese ? 'Workspace chưa có Team' : 'No teams in workspace yet')}</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">{isVietnamese ? 'Tạo Team để gom thành viên theo chức năng, squad hoặc dự án và theo dõi workload chung.' : 'Create teams to group members by function, squad or project and track shared workload.'}</p>
          {canManage && !query && (
            <button type="button" onClick={openCreate} className="mt-5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-blue-500/20 hover:bg-indigo-700 transition-all cursor-pointer">
              {isVietnamese ? 'Tạo Team đầu tiên' : 'Create First Team'}
            </button>
          )}
        </section>
      )}

      {/* Selected Team Sidebar Drawer */}
      {selectedTeam && (
        <>
          <button aria-label={isVietnamese ? "Đóng chi tiết Team" : "Close team details"} onClick={() => setSelectedTeamId(null)} className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-xs" />
          <aside className="fixed inset-y-0 right-0 z-[85] w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                  {renderSpaceIcon(selectedTeam.icon || '👥', "w-6 h-6")}
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedTeam.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{selectedTeam.description || (isVietnamese ? 'Chưa có mô tả' : 'No description')}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedTeamId(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-white">{isVietnamese ? `Thành viên (${selectedMembers.length})` : `Members (${selectedMembers.length})`}</h4>
                <p className="mt-0.5 text-[10px] text-slate-400">{isVietnamese ? 'Một người có thể thuộc nhiều Team khác nhau.' : 'Members can belong to multiple teams.'}</p>
              </div>
              {canManage && (
                <button type="button" onClick={() => setShowMembers(true)} className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-indigo-700 cursor-pointer">
                  <UserPlus className="h-3.5 w-3.5" /> {isVietnamese ? 'Thêm thành viên' : 'Add Member'}
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {selectedMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/60 p-3 dark:border-slate-800">
                  <div className="relative">
                    <SignedImage filePath={member.avatar} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${member.status === 'online' ? 'bg-emerald-500' : member.status === 'busy' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-slate-800 dark:text-white">{member.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{member.email} · {member.role}</p>
                  </div>
                  {member.id === selectedTeam.leader_id && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9.5px] font-black text-amber-600 dark:bg-amber-950/40 flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Lead
                    </span>
                  )}
                  {canManage && (
                    <button type="button" onClick={() => removeMember(member)} className="rounded-xl p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition-colors cursor-pointer" title={isVietnamese ? 'Xóa khỏi Team' : 'Remove from team'}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {!selectedMembers.length && (
                <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-xs font-medium text-slate-400 dark:border-slate-800">
                  {isVietnamese ? 'Chưa có thành viên trong Team này.' : 'No members in this team yet.'}
                </p>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs overflow-y-auto">
          <form onSubmit={saveTeam} className="w-full max-w-[460px] rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 my-auto text-left relative transition-all">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {editingTeam ? (isVietnamese ? 'Chỉnh sửa Team' : 'Edit Team') : (isVietnamese ? 'Tạo Team mới' : 'Create New Team')}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isVietnamese ? 'Tên Team phải là duy nhất trong workspace.' : 'Team name must be unique in this workspace.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4.5 space-y-3.5">
              {/* Section 1: Standard Icon Picker & Team Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {isVietnamese ? 'Biểu tượng & Tên Team *' : 'Icon & Team Name *'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {form.name.length}/80
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <EmojiIconPicker
                    value={form.icon || '👥'}
                    onChange={icon => setForm(prev => ({ ...prev, icon }))}
                    size="md"
                  />
                  <input
                    autoFocus
                    required
                    maxLength={80}
                    value={form.name}
                    onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                    placeholder={isVietnamese ? "Ví dụ: Product Design" : "e.g. Product Design"}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  />
                </div>

                {/* Quick Templates */}
                {!editingTeam && !form.name && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-medium text-slate-400 mr-0.5 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" /> {isVietnamese ? 'Gợi ý:' : 'Templates:'}
                    </span>
                    {TEAM_SUGGESTIONS.map(s => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, name: s.name, icon: s.icon, description: s.description }))}
                        className="rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/80 px-2 py-0.5 text-[10.5px] font-medium text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-500 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {renderSpaceIcon(s.icon, "w-3 h-3")}
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Short Description */}
              <label className="block text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {isVietnamese ? 'Mô tả ngắn' : 'Short Description'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {form.description.length}/240
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={240}
                  value={form.description}
                  onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
                  placeholder={isVietnamese ? "Mục tiêu và phạm vi của Team..." : "Objectives and scope of the team..."}
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/15 transition-all"
                />
              </label>

              {/* Section 4: Department & Team Lead */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-left">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {isVietnamese ? 'Phòng ban' : 'Department'}
                  </span>
                  <div className="relative">
                    <select
                      value={form.departmentId}
                      onChange={event => setForm(prev => ({ ...prev, departmentId: event.target.value }))}
                      className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-3 py-2 pr-8 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/15 transition-all cursor-pointer truncate"
                    >
                      <option value="">{isVietnamese ? 'Chưa phân phòng ban' : 'Unassigned department'}</option>
                      {departments.map(department => (
                        <option key={department.id} value={department.id}>
                          {department.parent_id ? `↳ ${department.name}` : department.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </label>

                <label className="block text-left">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {isVietnamese ? 'Trưởng nhóm' : 'Team Lead'}
                  </span>
                  <div className="relative">
                    <select
                      value={form.leaderId}
                      onChange={event => setForm(prev => ({ ...prev, leaderId: event.target.value }))}
                      className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-3 py-2 pr-8 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/15 transition-all cursor-pointer truncate"
                    >
                      <option value="">{isVietnamese ? 'Chưa chọn' : 'None'}</option>
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} {member.role ? `(${member.role})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </label>
              </div>

              {/* Section 5: Initial Members Selector */}
              <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-2.5 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {isVietnamese ? 'Thành viên Team' : 'Team Members'}
                    </span>
                    <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-1.5 py-0.2 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {form.selectedMemberIds.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddMembersInModal(!showAddMembersInModal)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="h-3 w-3" />
                    {showAddMembersInModal ? (isVietnamese ? 'Thu gọn' : 'Collapse') : (isVietnamese ? 'Chọn thành viên' : 'Select members')}
                  </button>
                </div>

                {/* Selected members avatar chips */}
                {form.selectedMemberIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.selectedMemberIds.map(mId => {
                      const m = members.find(u => u.id === mId);
                      if (!m) return null;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-0.5 pl-1 pr-2 shadow-2xs"
                        >
                          <SignedImage filePath={m.avatar} alt={m.name} className="h-4 w-4 rounded-full object-cover" />
                          <span className="text-[10.5px] font-medium text-slate-800 dark:text-slate-200 max-w-[90px] truncate">{m.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleMemberInForm(m.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors ml-0.5 cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Members dropdown checklist */}
                {showAddMembersInModal && (
                  <div className="mt-2.5 space-y-1.5 border-t border-slate-200/70 dark:border-slate-800 pt-2.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={modalMemberSearch}
                        onChange={e => setModalMemberSearch(e.target.value)}
                        placeholder={isVietnamese ? "Tìm thành viên..." : "Search members..."}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-2.5 text-xs font-medium outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {members
                        .filter(m => `${m.name} ${m.email}`.toLowerCase().includes(modalMemberSearch.toLowerCase()))
                        .map(m => {
                          const isSelected = form.selectedMemberIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleMemberInForm(m.id)}
                              className={`flex w-full items-center justify-between p-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-50/80 dark:bg-blue-950/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <SignedImage filePath={m.avatar} alt={m.name} className="h-6 w-6 rounded-full object-cover" />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-white">{m.name}</p>
                                  <p className="truncate text-[10px] text-slate-400">{m.email}</p>
                                </div>
                              </div>
                              <div className={`flex h-4 w-4 items-center justify-center rounded-md border transition-all ${
                                isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 6: Live Card Preview */}
              {form.name.trim() && (
                <div className="rounded-xl border border-dashed border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-2.5 px-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-2xs text-base border border-blue-100 dark:border-blue-900/40">
                      {renderSpaceIcon(form.icon || '👥', "w-4 h-4")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{form.name}</p>
                      <p className="truncate text-[10px] font-normal text-slate-400">
                        {form.description || (isVietnamese ? 'Chưa có mô tả' : 'No description')}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900">
                    {form.selectedMemberIds.length} {isVietnamese ? 'thành viên' : 'members'}
                  </span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <p className="rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                  {error}
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isVietnamese ? 'Hủy' : 'Cancel'}
              </button>
              <button
                disabled={saving || !form.name.trim()}
                type="submit"
                className="rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.98] px-5 py-2 text-xs font-bold text-white disabled:opacity-50 disabled:pointer-events-none shadow-xs shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving
                  ? (isVietnamese ? 'Đang lưu...' : 'Saving...')
                  : editingTeam
                    ? (isVietnamese ? 'Lưu thay đổi' : 'Save Changes')
                    : (isVietnamese ? 'Tạo Team' : 'Create Team')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Members Modal */}
      {showMembers && selectedTeam && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{isVietnamese ? 'Thêm thành viên vào Team' : 'Add Members to Team'}</h3>
                <p className="mt-1 text-[10px] text-slate-400">{isVietnamese ? `Chọn thành viên workspace để thêm vào ${selectedTeam.name}.` : `Select workspace members to add to ${selectedTeam.name}.`}</p>
              </div>
              <button type="button" onClick={() => setShowMembers(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={memberQuery} onChange={event => setMemberQuery(event.target.value)} placeholder={isVietnamese ? "Tìm theo tên hoặc email..." : "Search by name or email..."} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            </div>
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {availableMembers.map(member => (
                <button key={member.id} type="button" onClick={() => addMember(member)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer">
                  <SignedImage filePath={member.avatar} alt={member.name} className="h-9 w-9 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-slate-800 dark:text-white">{member.name}</p>
                    <p className="truncate text-[10px] text-slate-400">{member.email} · {member.role}</p>
                  </div>
                  <Plus className="h-4 w-4 text-indigo-500" />
                </button>
              ))}
              {!availableMembers.length && (
                <p className="py-10 text-center text-xs text-slate-400">{memberQuery ? (isVietnamese ? 'Không tìm thấy thành viên phù hợp.' : 'No matching members found.') : (isVietnamese ? 'Tất cả thành viên workspace đã ở trong Team này.' : 'All workspace members are already in this team.')}</p>
              )}
            </div>
            <button type="button" onClick={() => setShowMembers(false)} className="mt-4 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{isVietnamese ? 'Hoàn tất' : 'Done'}</button>
          </div>
        </div>
      )}
      {/* Confirm Delete Team Modal */}
      <ConfirmModal
        isOpen={!!teamToDelete}
        title={isVietnamese ? 'Xóa Nhóm' : 'Delete Team'}
        description={isVietnamese
          ? `Bạn có chắc chắn muốn xóa nhóm "${teamToDelete?.name}"? Các thành viên vẫn sẽ thuộc workspace và các nhiệm vụ công việc không bị ảnh hưởng.`
          : `Are you sure you want to delete the team "${teamToDelete?.name}"? Members will remain in the workspace and their tasks will not be deleted.`
        }
        itemName={teamToDelete?.name}
        confirmText={isVietnamese ? 'Xóa Nhóm' : 'Delete Team'}
        cancelText={isVietnamese ? 'Hủy' : 'Cancel'}
        isDestructive={true}
        type="danger"
        onConfirm={confirmDeleteTeam}
        onCancel={() => setTeamToDelete(null)}
      />
    </div>
  );
}
