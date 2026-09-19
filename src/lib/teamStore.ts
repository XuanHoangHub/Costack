"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';

export interface TeamItem {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  department?: string;
  memberCount?: number;
}

export const DEFAULT_TEAMS: TeamItem[] = [
  { id: 't-eng', name: 'Core Engineering', icon: '💻', color: '#0ea5e9', department: 'Engineering' },
  { id: 't-design', name: 'Product Design', icon: '🎨', color: '#a855f7', department: 'Design' },
  { id: 't-growth', name: 'Growth Marketing', icon: '📣', color: '#10b981', department: 'Marketing' },
  { id: 't-success', name: 'Customer Success', icon: '🎯', color: '#f59e0b', department: 'Support' },
  { id: 't-hq', name: 'Executive Headquarters', icon: '🏢', color: '#6366f1', department: 'Executive' }
];

export function getStoredTeams(workspaceId: string = 'default'): TeamItem[] {
  if (typeof window === 'undefined') return DEFAULT_TEAMS;
  try {
    const raw = localStorage.getItem(`apexa_teams_${workspaceId}`) || localStorage.getItem('apexa_teams_global');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t: any) => ({
          id: t.id,
          name: t.name || 'Team',
          icon: t.icon || '👥',
          color: t.color || '#6366f1',
          department: t.department || t.department_id || '',
          memberCount: t.memberCount || t.members?.length || 0
        }));
      }
    }
  } catch (_) {}
  return DEFAULT_TEAMS;
}

export function saveStoredTeams(workspaceId: string = 'default', teams: TeamItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`apexa_teams_${workspaceId}`, JSON.stringify(teams));
    window.dispatchEvent(new CustomEvent('apexa-teams-updated', { detail: { workspaceId, teams } }));
  } catch (_) {}
}

export function useWorkspaceTeams(workspaceId: string = 'default') {
  const [teams, setTeams] = useState<TeamItem[]>(() => getStoredTeams(workspaceId));

  useEffect(() => {
    let isMounted = true;

    const reload = () => {
      if (isMounted) setTeams(getStoredTeams(workspaceId));
    };

    reload();

    // Async fetch from Supabase if available
    const fetchRemote = async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('id, name, icon, color, department_id')
          .eq('workspace_id', workspaceId);

        if (!error && data && data.length > 0 && isMounted) {
          const formatted: TeamItem[] = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            icon: t.icon || '👥',
            color: t.color || '#6366f1',
            department: t.department_id || ''
          }));
          setTeams(formatted);
          saveStoredTeams(workspaceId, formatted);
        }
      } catch (_) {}
    };

    fetchRemote();

    const handleEvent = (e: any) => {
      if (e.detail?.workspaceId === workspaceId && isMounted) {
        setTeams(e.detail.teams);
      }
    };

    window.addEventListener('apexa-teams-updated', handleEvent);
    return () => {
      isMounted = false;
      window.removeEventListener('apexa-teams-updated', handleEvent);
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
