import { create } from 'zustand';
import type { User } from '@civitrace/shared';

type AuthState = {
  user: User | null;
  mustChangePassword: boolean;
  setUser: (user: User) => void;
  setMustChangePassword: (value: boolean) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  mustChangePassword: false,
  setUser: (user) => set({ user }),
  setMustChangePassword: (mustChangePassword) => set({ mustChangePassword }),
  clear: () => set({ user: null, mustChangePassword: false }),
}));