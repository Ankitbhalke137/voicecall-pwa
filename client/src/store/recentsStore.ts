import { create } from 'zustand';

export interface RecentCall {
  id: string;
  name: string;
  direction: 'out' | 'in';
  ts: number;
}

const STORAGE_KEY = 'voicecall-recents';
const MAX_RECENTS = 50;

function load(): RecentCall[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

interface RecentsState {
  recents: RecentCall[];
  addRecent: (entry: Omit<RecentCall, 'ts'>) => void;
  clear: () => void;
}

export const useRecentsStore = create<RecentsState>((set) => ({
  recents: load(),

  addRecent: (entry) =>
    set((state) => {
      const next = [
        { ...entry, ts: Date.now() },
        ...state.recents.filter((r) => r.id !== entry.id)
      ].slice(0, MAX_RECENTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { recents: next };
    }),

  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ recents: [] });
  }
}));