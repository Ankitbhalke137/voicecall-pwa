import { create } from 'zustand';
import type { CallSession, UserInfo } from '../types';

interface CallState extends CallSession {
  setStatus: (status: CallSession['status']) => void;
  setRemoteUser: (user: UserInfo | null) => void;
  setIncoming: (caller: UserInfo, callId: string) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setError: (message: string | undefined) => void;
  reset: () => void;
}

const initialSession: CallSession = {
  callId: null,
  status: 'IDLE',
  remoteUser: null,
  remoteStream: null,
  error: undefined
};

export const useCallStore = create<CallState>((set) => ({
  ...initialSession,

  setStatus: (status) => set({ status }),
  setRemoteUser: (remoteUser) => set({ remoteUser }),
  setIncoming: (remoteUser, callId) =>
    set({ remoteUser, callId, status: 'RINGING_INBOUND' }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialSession, remoteStream: null })
}));