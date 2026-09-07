import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { isApexaSuperAdmin } from '@/lib/admin/constants';

interface AuthState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
}

function normalizeUser(user: User | null): User | null {
  if (!user) return null;
  if (isApexaSuperAdmin(user.id)) {
    return {
      ...user,
      role: 'admin',
      isPremium: true,
      subscriptionPlan: 'enterprise',
      billingStatus: 'active',
    };
  }
  return user;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: normalizeUser(user) }),
      updateCurrentUser: (updates) =>
        set((state) => {
          if (!state.currentUser) return { currentUser: null };
          const merged = { ...state.currentUser, ...updates };
          return { currentUser: normalizeUser(merged) };
        }),
    }),
    {
      name: 'apexa_auth',
      partialize: (state) => ({ currentUser: normalizeUser(state.currentUser) }),
    }
  )
);

