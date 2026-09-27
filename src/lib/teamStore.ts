"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { useWorkspaceStore } from '@/store/workspaceStore';

export interface TeamItem {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  department?: string;
  memberCount?: number;
}

// Preset templates for inspiration when creating a team (NOT default fallback for workspace)
export const DEFAULT_TEAMS: TeamItem[] = [
  { id: 't-eng', name: 'Core Engineering', icon: '💻', color: '#0ea5e9', department: 'Engineering' },
  { id: 't-design', name: 'Product Design', icon: '🎨', color: '#a855f7', department: 'Design' },
  { id: 't-growth', name: 'Growth Marketing', icon: '📣', color: '#10b981', department: 'Marketing' },
  { id: 't-success', name: 'Customer Success', icon: '🎯', color: '#f59e0b', department: 'Support' },
  { id: 't-hq', name: 'Executive Headquarters', icon: '🏢', color: '#6366f1', department: 'Executive' }
];

export function resolveWorkspaceId(workspaceId?: string): string {
  if (workspaceId && workspaceId !== 'default') return workspaceId;
  if (typeof window !== 'undefined') {
    try {
      const fromStore = useWorkspaceStore.getState?.()?.activeWorkspaceId;
      if (fromStore) return fromStore;
      const fromWindow = (window as any)?.__APEXA_ACTIVE_WORKSPACE_ID__;
      if (fromWindow) return fromWindow;
      const fromLocal = localStorage.getItem('apexa_active_workspace_id');
      if (fromLocal) return fromLocal;
    } catch (_) {}
  }
  return '';
}

export function getStoredTeams(workspaceId?: string): TeamItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const wsId = resolveWorkspaceId(workspaceId);
    if (wsId) {
      const raw = localStorage.getItem(`apexa_teams_${wsId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return mapToTeamItems(parsed);
        }
      }
    }

    // Secondary fallback for global cached teams if explicitly set
    const globalRaw = localStorage.getItem('apexa_teams_global');
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Only return if workspace matches or not scoped
        return mapToTeamItems(parsed.filter((t: any) => !t.workspace_id || !wsId || t.workspace_id === wsId));
      }
    }
  } catch (_) {}
  return [];
}

function mapToTeamItems(parsed: any[]): TeamItem[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.map((t: any) => ({
    id: t.id,
    name: t.name || 'Team',
    icon: t.icon || '👥',
    color: t.color || '#6366f1',
    department: t.department || t.department_id || '',
    memberCount: t.memberCount || t.members?.length || 0
  }));
}

export function saveStoredTeams(workspaceId: string = 'default', teams: TeamItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const targetId = resolveWorkspaceId(workspaceId) || workspaceId;
    localStorage.setItem(`apexa_teams_${targetId}`, JSON.stringify(teams));
    window.dispatchEvent(new CustomEvent('apexa-teams-updated', { detail: { workspaceId: targetId, teams } }));
  } catch (_) {}
}

export function useWorkspaceTeams(workspaceId?: string) {
  const [teams, setTeams] = useState<TeamItem[]>(() => {
    const initialWsId = resolveWorkspaceId(workspaceId);
    return getStoredTeams(initialWsId);
  });

  useEffect(() => {
    let isMounted = true;
    const targetWsId = resolveWorkspaceId(workspaceId);

    const reload = () => {
      if (!isMounted) return;
      const stored = getStoredTeams(targetWsId);
      setTeams(stored);
    };

    reload();

    // Async fetch from Supabase
    const fetchRemote = async () => {
      try {
        let query = supabase
          .from('teams')
          .select('id, name, icon, color, department_id, workspace_id')
          .order('created_at', { ascending: true });

        if (targetWsId) {
          query = query.eq('workspace_id', targetWsId);
        }

        const { data, error } = await query;

        if (!error && Array.isArray(data) && isMounted) {
          const formatted: TeamItem[] = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            icon: t.icon || '👥',
            color: t.color || '#6366f1',
            department: t.department_id || ''
          }));
          setTeams(formatted);
          if (targetWsId) {
            saveStoredTeams(targetWsId, formatted);
          }
        }
      } catch (_) {}
    };

    fetchRemote();

    const handleEvent = (e: any) => {
      if (!isMounted) return;
      const eventWsId = e.detail?.workspaceId;
      if (eventWsId && targetWsId && eventWsId !== targetWsId) return;

      if (Array.isArray(e.detail?.teams)) {
        setTeams(mapToTeamItems(e.detail.teams));
      } else {
        reload();
      }
    };

    window.addEventListener('apexa-teams-updated', handleEvent);

    // Realtime Postgres changes subscription on teams table
    let channel: any = null;
    try {
      channel = supabase
        .channel(`realtime-teams-store-${targetWsId || 'global'}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'teams'
        }, () => {
          if (isMounted) fetchRemote();
        })
        .subscribe();
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener('apexa-teams-updated', handleEvent);
      if (channel) {
        try {
          void supabase.removeChannel(channel);
        } catch (_) {}
      }
    };
  }, [workspaceId]);

  return teams;
}

export function getTaskTeamIds(task: any): string[] {
  if (!task) return [];
  if (Array.isArray(task.teamIds) && task.teamIds.length > 0) return task.teamIds.filter(Boolean);
  if (Array.isArray(task.team_ids) && task.team_ids.length > 0) return task.team_ids.filter(Boolean);
  if (task.teamId) return [task.teamId];
  if (task.team_id) return [task.team_id];
  const customTeams = task.custom_fields?.teamIds || task.custom_fields?.teams;
  if (Array.isArray(customTeams)) return customTeams.filter(Boolean);
  return [];
}
