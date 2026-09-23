import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';
import { supabase } from '../api/supabase';
import { safeAsyncStorage } from '../api/storage';

interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  setCurrentUser: (user: User | null) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isLoading: true,
      setCurrentUser: (user) => set({ currentUser: user }),
      updateCurrentUser: async (updates) => {
        const user = get().currentUser;
        if (!user) return;
        const updated = { ...user, ...updates };
        set({ currentUser: updated });

        try {
          // Sync profile update with Supabase members table
          await supabase
            .from('members')
            .update({
              name: updated.name,
              department: updated.department,
              phone: updated.phone,
              status_message: updated.statusMessage,
            })
            .or(`user_id.eq.${user.id},id.eq.${user.id}`);
        } catch (e) {
          console.log('Error syncing profile update to Supabase:', e);
        }
      },
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.log('Signout error:', e);
        }
        set({ currentUser: null });
      },
      checkSession: async () => {
        try {
          set({ isLoading: true });
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const u = session.user;
            const googleName = u.user_metadata?.full_name || u.user_metadata?.name || '';
            const emailName = u.email?.split('@')[0] || 'Costack User';
            const name = googleName || emailName;
            const avatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || '';

            // Try to fetch profile from members table
            try {
              const { data: memberData } = await supabase
                .from('members')
                .select('*')
                .or(`user_id.eq.${u.id},id.eq.user-${u.id},email.eq.${u.email}`)
                .maybeSingle();

              if (memberData) {
                set({
                  currentUser: {
                    id: u.id,
                    name: memberData.name || name,
                    email: u.email || '',
                    avatar: memberData.avatar || avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                    role: memberData.role || 'admin',
                    status: 'online',
                    department: memberData.department || '',
                    phone: memberData.phone || '',
                    statusMessage: memberData.status_message || '',
                    isPremium: Boolean(memberData.is_premium ?? true),
                  },
                });
                return;
              }
            } catch (err) {
              console.log('Error querying members table:', err);
            }

            // Fallback to session user metadata
            set({
              currentUser: {
                id: u.id,
                name,
                email: u.email || '',
                avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                role: 'admin',
                status: 'online',
                isPremium: true,
              },
            });
          }
        } catch (err) {
          console.log('Error checking session:', err);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'apexa_mobile_auth',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
