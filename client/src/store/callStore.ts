import { create } from 'zustand';
import type { CallSession, UserInfo } from '../types';

import type { CallQualityMetrics } from '../types';

interface CallState extends CallSession {
  setStatus: (status: CallSession['status']) => void;
  setRemoteUser: (user: UserInfo | null) => void;
  setIncoming: (caller: UserInfo, callId: string) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setQualityMetrics: (qualityMetrics: CallQualityMetrics) => void;
  setError: (message: string | undefined) => void;
  reset: () => void;
}

const initialSession: CallSession = {
  callId: null,
  status: 'IDLE',
  remoteUser: null,
  remoteStream: null,
  qualityMetrics: undefined,
  error: undefined
};

export const useCallStore = create<CallState>((set) => ({
  ...initialSession,

  setStatus: (status) => set({ status }),
  setRemoteUser: (remoteUser) => set({ remoteUser }),
  setIncoming: (remoteUser, callId) =>
    set({ remoteUser, callId, status: 'RINGING_INBOUND' }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setQualityMetrics: (qualityMetrics) => set({ qualityMetrics }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialSession, remoteStream: null, qualityMetrics: undefined })
}));