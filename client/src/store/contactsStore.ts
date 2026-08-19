import { create } from 'zustand';
import { api, type AuthUser, type Contact } from '../services/api';

interface ContactsState {
  contacts: Contact[];
  presence: Record<string, boolean>;
  searchResults: AuthUser[];
  loading: boolean;
  load: () => Promise<void>;
  search: (q: string) => Promise<void>;
  clearSearch: () => void;
  add: (contactId: string) => Promise<void>;
  setPresence: (userId: string, online: boolean) => void;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  presence: {},
  searchResults: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const { contacts } = await api.getContacts();
      set({ contacts });
    } finally {
      set({ loading: false });
    }
  },

  search: async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      set({ searchResults: [] });
      return;
    }
    try {
      const { users } = await api.searchUsers(trimmed);
      const knownIds = new Set(get().contacts.map((c) => c.id));
      set({ searchResults: users.filter((u) => !knownIds.has(u.id)) });
    } catch {
      set({ searchResults: [] });
    }
  },

  clearSearch: () => set({ searchResults: [] }),

  add: async (contactId) => {
    await api.addContact(contactId);
    await get().load();
    set({ searchResults: [] });
  },

  setPresence: (userId, online) =>
    set((state) => ({
      presence: { ...state.presence, [userId]: online }
    }))
}));