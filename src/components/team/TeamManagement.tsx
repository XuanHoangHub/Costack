"use client";

import React, { useMemo, useState } from 'react';
import {
  ChevronRight, Crown, Edit3,
  Plus, Search, ShieldCheck, Trash2, UserPlus, Users, X
} from 'lucide-react';
import { Task, User } from '@/types';
import { supabase } from '@/supabaseClient';
import SignedImage from '../SignedImage';

interface TeamRow {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  icon?: string;
  leader_id?: string | null;
  announcement?: string | null;
  created_at?: string;
}

interface TeamMemberRow {
  id?: string | number;
  team_id: string;
  member_id: string;
  role?: 'lead' | 'member';
}

interface TeamManagementProps {
  teams: TeamRow[];
  memberships: TeamMemberRow[];
  members: User[];
  tasks: Task[];
  activeWorkspaceId: string;
  canManage: boolean;
  onTeamsChange: React.Dispatch<React.SetStateAction<any[]>>;
  onMembershipsChange: React.Dispatch<React.SetStateAction<any[]>>;
  onAddSyncLog: (action: string) => void;
}

const TEAM_ICONS = ['👥', '🚀', '💻', '🎨', '📣', '💼', '🧠', '🎯', '🛠️', '🌱'];

export default function TeamManagement({
  teams, memberships, members, tasks, activeWorkspaceId, canManage,
  onTeamsChange, onMembershipsChange, onAddSyncLog,
}: TeamManagementProps) {
  const [query, setQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', icon: TEAM_ICONS[0], leaderId: '' });

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
    setForm({ name: '', description: '', icon: TEAM_ICONS[0], leaderId: '' });
    setError('');
    setShowEditor(true);
  };

  const openEdit = (team: TeamRow) => {
    setEditingTeam(team);
    setForm({ name: team.name, description: team.description || '', icon: team.icon || TEAM_ICONS[0], leaderId: team.leader_id || '' });
    setError('');
    setShowEditor(true);
  };

  const ensureLeaderMembership = async (team: TeamRow, leaderId: string) => {
    const previous = memberships.filter(item => item.team_id === team.id);
    const existingLeader = previous.find(item => item.member_id === leaderId);

    await supabase
      .from('team_members')
      .update({ role: 'member' })
      .eq('team_id', team.id)
      .eq('role', 'lead')
      .neq('member_id', leaderId);

    if (existingLeader) {
      const { data } = await supabase
        .from('team_members')
        .update({ role: 'lead' })
        .eq('team_id', team.id)
        .eq('member_id', leaderId)
        .select()
        .single();
      if (data) {
        onMembershipsChange(items => items.map(item => {
          if (item.team_id !== team.id) return item;
          if (item.member_id === leaderId) return data;
          return item.role === 'lead' ? { ...item, role: 'member' } : item;
        }));
      }
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase.from('team_members').insert({
      team_id: team.id,
      member_id: leaderId,
      role: 'lead',
      added_by: session?.user?.id || null,
    }).select().single();
    if (data) {
      onMembershipsChange(items => [
        ...items.map(item => item.team_id === team.id && item.role === 'lead' ? { ...item, role: 'member' } : item),
        data,
      ]);
    }
  };

  const saveTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name || !canManage) return;
    if (workspaceTeams.some(team => team.id !== editingTeam?.id && team.name.toLowerCase() === name.toLowerCase())) {
      setError('Tên Team đã tồn tại trong workspace.');
      return;
    }
    setSaving(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setError('Phiên đăng nhập đã hết hạn.');
      setSaving(false);
      return;
    }
    const payload = {
      name,
      description: form.description.trim(),
      icon: form.icon,
      leader_id: form.leaderId || null,
      workspace_id: activeWorkspaceId,
      user_id: session.user.id,
      updated_at: new Date().toISOString(),
    };
    if (editingTeam) {
      const { data, error: updateError } = await supabase.from('teams').update(payload).eq('id', editingTeam.id).select().single();
      if (updateError) setError(updateError.message);
      else {
        onTeamsChange(prev => prev.map(team => team.id === editingTeam.id ? data : team));
        if (form.leaderId) await ensureLeaderMembership(data, form.leaderId);
        onAddSyncLog(`Đã cập nhật Team “${name}”`);
        setShowEditor(false);
      }
    } else {
      const record = { ...payload, id: `team-${crypto.randomUUID()}`, created_at: new Date().toISOString() };
      const { data, error: insertError } = await supabase.from('teams').insert(record).select().single();
      if (insertError) setError(insertError.message);
      else {
        onTeamsChange(prev => [...prev, data]);
        if (form.leaderId) await ensureLeaderMembership(data, form.leaderId);
        setSelectedTeamId(data.id);
        onAddSyncLog(`Đã tạo Team “${name}”`);
        setShowEditor(false);
        setShowMembers(true);
      }
    }
    setSaving(false);
  };

  const deleteTeam = async (team: TeamRow) => {
    if (!canManage || !window.confirm(`Xóa Team “${team.name}”? Thành viên sẽ không bị xóa khỏi workspace.`)) return;
    const { error: membersError } = await supabase.from('team_members').delete().eq('team_id', team.id);
    if (membersError) return;
    const { error: teamError } = await supabase.from('teams').delete().eq('id', team.id);
    if (teamError) return;
    onMembershipsChange(prev => prev.filter(item => item.team_id !== team.id));
    onTeamsChange(prev => prev.filter(item => item.id !== team.id));
    if (selectedTeamId === team.id) setSelectedTeamId(null);
    onAddSyncLog(`Đã xóa Team “${team.name}”`);
  };

  const addMember = async (member: User) => {
    if (!selectedTeam || !canManage || selectedMemberIds.has(member.id)) return;
    const { data: { session } } = await supabase.auth.getSession();
    const row = { team_id: selectedTeam.id, member_id: member.id, role: member.id === selectedTeam.leader_id ? 'lead' : 'member', added_by: session?.user?.id || null };
    const { data, error: insertError } = await supabase.from('team_members').insert(row).select().single();
    if (!insertError && data) {
      onMembershipsChange(prev => [...prev, data]);
      onAddSyncLog(`Đã thêm ${member.name} vào Team “${selectedTeam.name}”`);
    }
  };

  const removeMember = async (member: User) => {
    if (!selectedTeam || !canManage) return;
    const { error: deleteError } = await supabase.from('team_members').delete().eq('team_id', selectedTeam.id).eq('member_id', member.id);
    if (!deleteError) {
      onMembershipsChange(prev => prev.filter(item => !(item.team_id === selectedTeam.id && item.member_id === member.id)));
      if (member.id === selectedTeam.leader_id) {
        const { data } = await supabase.from('teams').update({ leader_id: null, updated_at: new Date().toISOString() }).eq('id', selectedTeam.id).select().single();
        if (data) onTeamsChange(prev => prev.map(team => team.id === selectedTeam.id ? data : team));
      }
      onAddSyncLog(`Đã đưa ${member.name} khỏi Team “${selectedTeam.name}”`);
    }
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

  return <div className="space-y-5">
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
      <div><div className="flex items-center gap-2"><Users className="h-5 w-5 text-indigo-500" /><h3 className="text-lg font-black text-slate-900 dark:text-white">Teams Hub</h3></div><p className="mt-1 text-[11px] font-medium text-slate-400">Tạo nhóm chức năng, squad hoặc leadership team từ thành viên trong workspace.</p></div>
      <div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm Team..." className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></div>{canManage && <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-indigo-700"><Plus className="h-4 w-4" /> Tạo Team</button>}</div>
    </section>

    <section className="grid grid-cols-3 gap-3">{[
      ['Tổng số Team', stats.teams], ['Đã vào Team', stats.assigned], ['Chưa phân nhóm', stats.unassigned]
    ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p></div>)}</section>

    {!canManage && <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400"><ShieldCheck className="h-4 w-4" /> Chỉ Owner và Admin có thể tạo Team hoặc thay đổi thành viên.</div>}

    {filteredTeams.length ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredTeams.map(team => {
      const metric = teamMetrics(team);
      const teamMemberIds = memberships.filter(item => item.team_id === team.id).map(item => item.member_id);
      const teamMembers = members.filter(member => teamMemberIds.includes(member.id));
      const leader = members.find(member => member.id === team.leader_id);
      return <article key={team.id} className="group rounded-3xl border border-slate-200/70 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900">
        <div className="flex items-start justify-between gap-3"><button type="button" onClick={() => setSelectedTeamId(team.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl dark:bg-indigo-950/40">{team.icon || '👥'}</span><span className="min-w-0"><span className="block truncate text-sm font-black text-slate-900 dark:text-white">{team.name}</span><span className="mt-1 block line-clamp-1 text-[10px] font-medium text-slate-400">{team.description || 'Chưa có mô tả'}</span></span></button>{canManage && <div className="flex gap-1 opacity-0 transition group-hover:opacity-100"><button type="button" onClick={() => openEdit(team)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"><Edit3 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => deleteTeam(team)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" /></button></div>}</div>
        <button type="button" onClick={() => setSelectedTeamId(team.id)} className="mt-5 w-full text-left"><div className="flex items-center justify-between"><div className="flex -space-x-2">{teamMembers.slice(0,5).map(member => <SignedImage key={member.id} filePath={member.avatar} alt={member.name} className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-slate-900" />)}{metric.memberCount === 0 && <span className="flex h-8 items-center rounded-full border border-dashed border-slate-300 px-3 text-[9px] font-bold text-slate-400 dark:border-slate-700">Chưa có thành viên</span>}{metric.memberCount > 5 && <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-black text-slate-500 dark:border-slate-900 dark:bg-slate-800">+{metric.memberCount - 5}</span>}</div><ChevronRight className="h-4 w-4 text-slate-300" /></div>{leader && <p className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-slate-400"><Crown className="h-3 w-3 text-amber-500" /> Lead: {leader.name}</p>}<div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center dark:border-slate-800"><div><p className="text-sm font-black text-slate-800 dark:text-white">{metric.memberCount}</p><p className="text-[8px] font-bold text-slate-400">Thành viên</p></div><div><p className="text-sm font-black text-slate-800 dark:text-white">{metric.open}</p><p className="text-[8px] font-bold text-slate-400">Việc mở</p></div><div><p className="text-sm font-black text-emerald-500">{metric.completion}%</p><p className="text-[8px] font-bold text-slate-400">Hoàn thành</p></div></div></button>
      </article>;
    })}</section> : <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center dark:border-slate-700 dark:bg-slate-900/30"><Users className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">{query ? 'Không tìm thấy Team' : 'Workspace chưa có Team'}</h3><p className="mx-auto mt-1 max-w-md text-xs text-slate-400">Tạo Team để gom thành viên theo chức năng, squad hoặc dự án và theo dõi workload chung.</p>{canManage && !query && <button type="button" onClick={openCreate} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white">Tạo Team đầu tiên</button>}</section>}

    {selectedTeam && <><button aria-label="Đóng chi tiết Team" onClick={() => setSelectedTeamId(null)} className="fixed inset-0 z-[80] bg-slate-950/30 backdrop-blur-[2px]" /><aside className="fixed inset-y-0 right-0 z-[85] w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl dark:bg-indigo-950/40">{selectedTeam.icon || '👥'}</span><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedTeam.name}</h3><p className="mt-0.5 text-[10px] text-slate-400">{selectedTeam.description || 'Chưa có mô tả'}</p></div></div><button type="button" onClick={() => setSelectedTeamId(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div><div className="mt-6 flex items-center justify-between"><div><h4 className="text-xs font-black text-slate-800 dark:text-white">Thành viên ({selectedMembers.length})</h4><p className="mt-0.5 text-[9px] text-slate-400">Một người có thể thuộc nhiều Team.</p></div>{canManage && <button type="button" onClick={() => setShowMembers(true)} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black text-white"><UserPlus className="h-3.5 w-3.5" /> Thêm thành viên</button>}</div><div className="mt-4 space-y-2">{selectedMembers.map(member => <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800"><div className="relative"><SignedImage filePath={member.avatar} alt={member.name} className="h-10 w-10 rounded-full object-cover" /><span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${member.status === 'online' ? 'bg-emerald-500' : member.status === 'busy' ? 'bg-rose-500' : 'bg-slate-400'}`} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-slate-800 dark:text-white">{member.name}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{member.email}</p></div>{member.id === selectedTeam.leader_id && <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-black text-amber-600 dark:bg-amber-950/30"><Crown className="mr-1 inline h-3 w-3" />Lead</span>}{canManage && <button type="button" onClick={() => removeMember(member)} className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"><X className="h-3.5 w-3.5" /></button>}</div>)}{!selectedMembers.length && <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400 dark:border-slate-700">Chưa có thành viên trong Team.</p>}</div></aside></>}

    {showEditor && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><form onSubmit={saveTeam} className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{editingTeam ? 'Chỉnh sửa Team' : 'Tạo Team mới'}</h3><p className="mt-1 text-[10px] text-slate-400">Tên Team phải là duy nhất trong workspace.</p></div><button type="button" onClick={() => setShowEditor(false)} className="rounded-lg p-1.5 text-slate-400"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-4"><div><p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Icon</p><div className="flex flex-wrap gap-2">{TEAM_ICONS.map(icon => <button key={icon} type="button" onClick={() => setForm(prev => ({...prev,icon}))} className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${form.icon === icon ? 'bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-950' : 'bg-slate-50 dark:bg-slate-800'}`}>{icon}</button>)}</div></div><label className="block"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Tên Team *</span><input autoFocus required maxLength={80} value={form.name} onChange={event => setForm(prev => ({...prev,name:event.target.value}))} placeholder="Ví dụ: Product Design" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></label><label className="block"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Mô tả</span><textarea rows={3} maxLength={240} value={form.description} onChange={event => setForm(prev => ({...prev,description:event.target.value}))} placeholder="Mục tiêu và phạm vi của Team..." className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></label><label className="block"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Team Lead</span><select value={form.leaderId} onChange={event => setForm(prev => ({...prev,leaderId:event.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 dark:text-white"><option value="">Chưa chọn</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>{error && <p className="rounded-xl bg-rose-50 p-3 text-[10px] font-bold text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">{error}</p>}</div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowEditor(false)} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-500">Hủy</button><button disabled={saving} type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? 'Đang lưu...' : editingTeam ? 'Lưu thay đổi' : 'Tạo Team'}</button></div></form></div>}

    {showMembers && selectedTeam && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><div><h3 className="text-lg font-black text-slate-900 dark:text-white">Thêm thành viên</h3><p className="mt-1 text-[10px] text-slate-400">Chọn từ thành viên của workspace để thêm vào {selectedTeam.name}.</p></div><button type="button" onClick={() => setShowMembers(false)} className="rounded-lg p-1.5 text-slate-400"><X className="h-4 w-4" /></button></div><div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input autoFocus value={memberQuery} onChange={event => setMemberQuery(event.target.value)} placeholder="Tìm theo tên hoặc email..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></div><div className="mt-3 max-h-80 space-y-1 overflow-y-auto">{availableMembers.map(member => <button key={member.id} type="button" onClick={() => addMember(member)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><SignedImage filePath={member.avatar} alt={member.name} className="h-9 w-9 rounded-full object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-slate-800 dark:text-white">{member.name}</p><p className="truncate text-[9px] text-slate-400">{member.email} · {member.role}</p></div><Plus className="h-4 w-4 text-indigo-500" /></button>)}{!availableMembers.length && <p className="py-10 text-center text-xs text-slate-400">{memberQuery ? 'Không tìm thấy thành viên phù hợp.' : 'Tất cả thành viên workspace đã ở trong Team.'}</p>}</div><button type="button" onClick={() => setShowMembers(false)} className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">Hoàn tất</button></div></div>}
  </div>;
}
