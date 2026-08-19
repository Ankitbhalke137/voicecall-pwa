import { create } from 'zustand';
import { api, type AuthUser } from '../services/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  initializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('voicecall-token'),
  initializing: true,

  login: async (username, password) => {
    const { token, user } = await api.login(username, password);
    localStorage.setItem('voicecall-token', token);
    set({ token, user });
  },

  register: async (username, password, displayName) => {
    const { token, user } = await api.register(username, password, displayName);
    localStorage.setItem('voicecall-token', token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('voicecall-token');
    set({ user: null, token: null });
  },

  restore: async () => {
    const token = localStorage.getItem('voicecall-token');
    if (!token) {
      set({ initializing: false });
      return;
    }
    try {
      const { user } = await api.me();
      set({ user, token, initializing: false });
    } catch {
      localStorage.removeItem('voicecall-token');
      set({ user: null, token: null, initializing: false });
    }
  }
}));