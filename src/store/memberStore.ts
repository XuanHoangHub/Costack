import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface MemberState {
  members: User[];
  setMembers: (members: User[] | ((prev: User[]) => User[])) => void;
  addMember: (member: User) => void;
  updateMember: (member: User) => void;
  deleteMember: (id: string) => void;
}

export const useMemberStore = create<MemberState>()(
  persist(
    (set, get) => ({
      members: [],
      setMembers: (members) => set({ members: typeof members === 'function' ? members(get().members) : members }),
      addMember: (member) => set((state) => ({ members: [...state.members, member] })),
      updateMember: (updated) =>
        set((state) => ({
          members: state.members.map((m) => (m.id === updated.id ? updated : m)),
        })),
      deleteMember: (id) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        })),
    }),
    {
      name: 'avaxa_members',
    }
  )
);
