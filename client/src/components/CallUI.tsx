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

export default function CallUI({ status, remoteName, onAnswer, onDecline, onHangup }: CallUIProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (status === 'CONNECTED') {
      audioRef.current.play().catch(() => {});
    } else if (status === 'RINGING_OUTBOUND' || status === 'RINGING_INBOUND') {
      audioRef.current.pause();
    }
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