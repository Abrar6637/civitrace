import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { CitizenSession, User } from '@civitrace/shared';
import { authService } from '../services/auth.service';

const TOKEN_KEY = 'civitrace.session';

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  token: string | null;
  user: User | null;
  profileComplete: boolean;
  bootstrap: () => Promise<void>;
  signIn: (session: CitizenSession) => Promise<void>;
  updateUser: (user: User, profileComplete: boolean) => void;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  token: null,
  user: null,
  profileComplete: false,

  // On app start: restore the saved session from the phone's secure storage
  bootstrap: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      set({ status: 'signedOut' });
      return;
    }
    try {
      const session = await authService.me(token);
      set({ status: 'signedIn', token, user: session.user, profileComplete: session.profileComplete });
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ status: 'signedOut', token: null, user: null });
    }
  },

  signIn: async (session) => {
    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
    set({ status: 'signedIn', token: session.token, user: session.user, profileComplete: session.profileComplete });
  },

  updateUser: (user, profileComplete) => set({ user, profileComplete }),

  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ status: 'signedOut', token: null, user: null, profileComplete: false });
  },
}));