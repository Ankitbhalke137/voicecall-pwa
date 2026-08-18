import { useEffect, useRef, useState } from 'react';
import { CallSessionManager } from '../services/webrtc';
import { useCallStore } from '../store/callStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:8080/ws';

export type SocketState = 'connecting' | 'open' | 'closed' | 'error';

export function useCallSession(userId: string, userName: string) {
  const managerRef = useRef<CallSessionManager | null>(null);
  const [socketState, setSocketState] = useState<SocketState>('connecting');
  const {
    status,
    remoteUser,
    error,
    setStatus,
    setRemoteUser,
    setIncoming,
    setError,
    reset
  } = useCallStore();

  useEffect(() => {
    if (!userId) return;
    const manager = new CallSessionManager(SOCKET_URL, userId, userName);
    managerRef.current = manager;

    setSocketState('connecting');
    manager.onSocketState = setSocketState;
    manager.onStatusChange = setStatus;
    manager.onIncomingCall = (caller, callId) => setIncoming(caller, callId);
    manager.onRemoteStream = () => {};
    manager.onError = setError;
    manager.onRemoteHangup = () => {
      manager.hangup();
      reset();
    };

    return () => {
      manager.dispose();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const call = async (targetId: string, targetName: string) => {
    setError(undefined);
    setRemoteUser({ id: targetId, name: targetName });
    try {
      await managerRef.current?.initiateCall(targetId, targetName);
    } catch (err) {
      setError('Failed to start call: ' + (err as Error).message);
    }
  };

  const answer = async () => {
    setError(undefined);
    if (managerRef.current && remoteUser) {
      try {
        await managerRef.current.acceptCall(remoteUser.id);
      } catch (err) {
        setError('Failed to answer: ' + (err as Error).message);
      }
    }
  };

  const decline = () => {
    managerRef.current?.declineCall();
    reset();
  };

  const hangup = () => {
    managerRef.current?.hangup();
    reset();
  };

  return { status, remoteUser, error, socketState, call, answer, decline, hangup };
}