import { useEffect, useRef } from 'react';
import type { CallStatus } from '../types';

interface CallUIProps {
  status: CallStatus;
  remoteName: string;
  onAnswer: () => void;
  onDecline: () => void;
  onHangup: () => void;
}

const STATUS_LABELS: Record<CallStatus, string> = {
  IDLE: 'Idle',
  RINGING_OUTBOUND: 'Calling...',
  RINGING_INBOUND: 'Incoming Call',
  CONNECTED: 'Connected',
  RECONNECTING: 'Reconnecting...',
  TERMINATED: 'Call Ended'
};

function playRingtone(status: CallStatus): () => void {
  if (status !== 'RINGING_OUTBOUND' && status !== 'RINGING_INBOUND') return () => {};
  let stopped = false;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const interval = setInterval(() => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = status === 'RINGING_INBOUND' ? 800 : 600;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.75);
    }, 1200);
    return () => {
      stopped = true;
      clearInterval(interval);
      ctx.close().catch(() => {});
    };
  } catch {
    return () => {};
  }
}

export default function CallUI({ status, remoteName, onAnswer, onDecline, onHangup }: CallUIProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (status === 'CONNECTED') {
      audioRef.current.play().catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    const stopRingtone = playRingtone(status);
    return stopRingtone;
  }, [status]);

  return (
    <div className="call-ui">
      <audio ref={audioRef} id="remote-audio" autoPlay />
      <div className="call-avatar">{remoteName.charAt(0).toUpperCase()}</div>
      <h2 className="call-name">{remoteName}</h2>
      <p className="call-status">{STATUS_LABELS[status]}</p>

      <div className="call-actions">
        {status === 'RINGING_INBOUND' && (
          <>
            <button className="btn btn-answer" onClick={onAnswer}>Answer</button>
            <button className="btn btn-decline" onClick={onDecline}>Decline</button>
          </>
        )}

        {(status === 'RINGING_OUTBOUND' || status === 'CONNECTED' || status === 'RECONNECTING') && (
          <button className="btn btn-hangup" onClick={onHangup}>Hang Up</button>
        )}
      </div>
    </div>
  );
}