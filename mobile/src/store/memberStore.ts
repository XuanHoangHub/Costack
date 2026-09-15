import { create } from 'zustand';
import { supabase, getCleanChannel } from '../api/supabase';

export interface Member {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
  department?: string;
  status: 'online' | 'busy' | 'offline';
  avatar?: string;
  phone?: string;
  statusMessage?: string;
  isPremium?: boolean;
  workspaceIds?: string[];
}

interface MemberState {
  members: Member[];
  isLoading: boolean;
  fetchMembers: () => Promise<void>;
  subscribeToMembers: () => () => void;
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  isLoading: false,

  fetchMembers: async () => {
    try {
      set({ isLoading: true });
      const { data, error } = await supabase.from('members').select('*');
      if (!error && data) {
        const mapped: Member[] = data.map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          name: m.name || m.email?.split('@')[0] || 'Member',
          email: m.email || '',
          role: m.role === 'admin' || m.role === 'owner' ? 'admin' : 'member',
          department: m.department || 'Đội ngũ Upgen',
          status: m.status === 'online' ? 'online' : m.status === 'busy' ? 'busy' : 'offline',
          avatar: m.avatar || undefined,
          phone: m.phone || undefined,
          statusMessage: m.status_message || undefined,
          isPremium: Boolean(m.is_premium ?? true),
          workspaceIds: m.workspace_ids || [],
        }));
        set({ members: mapped });
      }
    } catch (err) {
      console.warn('Failed to fetch members:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  subscribeToMembers: () => {
    const channel = getCleanChannel('mobile-team-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        () => {
          get().fetchMembers();
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  },
}));
