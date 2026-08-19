import { useEffect, useRef, useState } from 'react';
import { CallSessionManager } from '../services/webrtc';
import { useCallStore } from '../store/callStore';
import { useContactsStore } from '../store/contactsStore';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

const PENDING_ACCEPT_KEY = 'voicecall-pending-accept';

export type SocketState = 'connecting' | 'open' | 'closed' | 'error';

export function storePendingAccept(callerId: string, callId: string) {
  localStorage.setItem(PENDING_ACCEPT_KEY, JSON.stringify({ callerId, callId }));
}

export function useCallSession(userId: string, userName: string, token: string | null) {
  const managerRef = useRef<CallSessionManager | null>(null);
  const [socketState, setSocketState] = useState<SocketState>('connecting');
  const [pushRinging, setPushRinging] = useState(false);
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
  const setPresence = useContactsStore((s) => s.setPresence);

  useEffect(() => {
    if (!userId || !token) return;
    const manager = new CallSessionManager(SOCKET_URL, userId, token, userName);
    managerRef.current = manager;

    setSocketState('connecting');
    manager.onSocketState = setSocketState;
    manager.onStatusChange = setStatus;
    manager.onIncomingCall = (caller, callId) => {
      setIncoming(caller, callId);
      storePendingAccept(caller.id, callId);
    };
    manager.onRemoteStream = (stream) => {
      const tracks = stream.getAudioTracks();
      const audio = document.getElementById('remote-audio') as HTMLAudioElement | null;
      if (audio && tracks.length > 0) {
        audio.srcObject = stream;
        audio.play().catch(() => {});
      }
    };
    manager.onError = setError;
    manager.onRemoteHangup = () => {
      manager.hangup();
      reset();
    };
    manager.onPresence = (id, online) => setPresence(id, online);
    manager.onCallPushed = () => {
      setPushRinging(true);
      setTimeout(() => setPushRinging(false), 6000);
    };

    return () => {
      manager.dispose();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token]);

  useEffect(() => {
    if (!managerRef.current) return;
    const pending = localStorage.getItem(PENDING_ACCEPT_KEY);
    if (!pending) return;
    localStorage.removeItem(PENDING_ACCEPT_KEY);
    const { callerId, callId } = JSON.parse(pending);
    setTimeout(() => {
      managerRef.current?.acceptCall(callerId, callId).catch(() => {});
    }, 400);
  }, [socketState]);

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
    localStorage.removeItem(PENDING_ACCEPT_KEY);
    if (managerRef.current && remoteUser) {
      try {
        await managerRef.current.acceptCall(remoteUser.id);
      } catch (err) {
        setError('Failed to answer: ' + (err as Error).message);
      }
    }
  };

  const decline = () => {
    localStorage.removeItem(PENDING_ACCEPT_KEY);
    managerRef.current?.declineCall();
    reset();
  };

  const hangup = () => {
    localStorage.removeItem(PENDING_ACCEPT_KEY);
    managerRef.current?.hangup();
    reset();
  };

  return { status, remoteUser, error, socketState, pushRinging, call, answer, decline, hangup };
}