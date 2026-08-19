import { useEffect, useRef, useState } from 'react';
import type { CallStatus } from '../types';

interface CallUIProps {
  status: CallStatus;
  remoteName: string;
  onAnswer: () => void;
  onDecline: () => void;
  onHangup: () => void;
  muted?: boolean;
  speakerOn?: boolean;
  onHold?: boolean;
  onToggleMute?: () => void;
  onToggleSpeaker?: () => void;
  onToggleHold?: () => void;
}

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

function Avatar({ name, green = false }: { name: string; green?: boolean }) {
  return (
    <div className="relative">
      <div
        className={`w-40 h-40 rounded-full ${
          green ? 'pulse-avatar-green' : 'pulse-avatar'
        } bg-surface-container-high border-2 border-primary/30 flex items-center justify-center overflow-hidden z-10 relative`}
      >
        <span className="text-6xl font-bold text-primary">{name.charAt(0).toUpperCase()}</span>
      </div>
    </div>
  );
}

function Waveform() {
  const heights = ['h-2', 'h-6', 'h-10', 'h-4', 'h-8', 'h-5', 'h-3', 'h-2'];
  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      {heights.map((h, i) => (
        <div key={i} className={`w-1.5 rounded-full bg-primary/60 waveform-bar ${h}`} />
      ))}
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function ControlButton({
  icon,
  label,
  active = false,
  danger = false,
  onClick
}: {
  icon: string;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`w-14 h-14 rounded-full flex items-center justify-center btn-press ${
        danger
          ? 'bg-error text-on-error shadow-[0_0_20px_rgba(255,180,171,0.3)]'
          : active
            ? 'bg-secondary text-on-secondary'
            : 'bg-surface/50 text-on-surface hover:bg-surface-variant transition-colors'
      }`}
      onClick={onClick}
      aria-label={label}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );
}

function ActiveCallScreen({
  remoteName,
  status,
  muted,
  speakerOn,
  onHold,
  onToggleMute,
  onToggleSpeaker,
  onToggleHold,
  onHangup
}: CallUIProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'CONNECTED') {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-between overflow-hidden relative">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full flex justify-between items-center px-container-margin-mobile pt-8 z-10">
        <span className="material-symbols-outlined text-outline">lock</span>
        <div className="flex items-center gap-2 bg-surface-container/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {onHold ? 'On Hold' : 'HD Voice'}
          </span>
        </div>
        <span className="material-symbols-outlined text-outline">more_vert</span>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-[400px] z-10 px-container-margin-mobile">
        <div className="mb-12">
          <Avatar name={remoteName} />
        </div>
        <div className="text-center mb-8">
          <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-background mb-2 tracking-tight">
            {remoteName}
          </h1>
          <p className="call-timer font-headline-md text-headline-md text-primary font-mono tracking-widest">
            {status === 'RECONNECTING' ? 'Reconnecting…' : formatElapsed(elapsed)}
          </p>
        </div>
        <Waveform />
      </main>

      <div className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 pb-10 pt-6 px-container-margin-mobile z-50">
        <div className="glass-panel rounded-[32px] p-4 flex justify-between items-center shadow-2xl">
          <ControlButton
            icon="mic_off"
            label="Mute"
            active={muted}
            onClick={onToggleMute}
          />
          <ControlButton
            icon="volume_up"
            label="Speaker"
            active={speakerOn}
            onClick={onToggleSpeaker}
          />
          <ControlButton icon="pause" label="Hold" active={onHold} onClick={onToggleHold} />
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center bg-error text-on-error shadow-[0_0_20px_rgba(255,180,171,0.3)] btn-press"
            onClick={onHangup}
            aria-label="Hang Up"
          >
            <span className="material-symbols-outlined fill-icon text-[32px]">call_end</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function IncomingCallScreen({
  remoteName,
  onAnswer,
  onDecline
}: CallUIProps) {
  return (
    <div className="h-full w-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-wallpaper z-0" />

      <div className="z-50 w-full max-w-sm mx-auto px-container-margin-mobile">
        <div className="glass-panel rounded-[24px] p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-secondary/20 rounded-full blur-[40px] z-0" />
          <div className="relative z-10 w-full">
            <div className="mb-8">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                Incoming Call
              </p>
              <h2 className="font-display-lg-mobile text-display-lg-mobile text-on-surface mb-1">
                {remoteName}
              </h2>
            </div>

            <div className="relative w-32 h-32 mx-auto mb-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-secondary pulse-avatar-green" />
              <div className="w-28 h-28 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center z-10 shadow-lg">
                <span className="text-5xl font-bold text-primary">
                  {remoteName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute bottom-0 right-0 bg-surface-container-high border border-white/10 rounded-full px-3 py-1 z-20 flex items-center gap-1 shadow-lg">
                <span className="material-symbols-outlined text-[14px] text-secondary">hd</span>
                <span className="font-label-sm text-label-sm text-on-surface">Voice</span>
              </div>
            </div>

            <div className="flex justify-between items-center w-full px-4 gap-6">
              <button
                className="flex flex-col items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-error rounded-xl p-2 transition-transform active:scale-95"
                onClick={onDecline}
              >
                <div className="w-16 h-16 rounded-full bg-error text-on-error flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                  <span className="material-symbols-outlined text-[32px] fill-icon">call_end</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Decline</span>
              </button>
              <button
                className="flex flex-col items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-secondary rounded-xl p-2 transition-transform active:scale-95"
                onClick={onAnswer}
              >
                <div className="w-16 h-16 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                  <span className="material-symbols-outlined text-[32px] fill-icon">call</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Answer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallingScreen({ remoteName, onHangup }: CallUIProps) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-between overflow-hidden relative">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[400px] z-10 px-container-margin-mobile">
        <div className="mb-12">
          <Avatar name={remoteName} />
        </div>
        <div className="text-center mb-8">
          <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-background mb-2 tracking-tight">
            {remoteName}
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Calling...
          </p>
        </div>
        <Waveform />
      </div>

      <div className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 pb-10 pt-6 px-container-margin-mobile z-50">
        <div className="glass-panel rounded-[32px] p-4 flex justify-center items-center shadow-2xl">
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center bg-error text-on-error shadow-[0_0_20px_rgba(255,180,171,0.3)] btn-press"
            onClick={onHangup}
            aria-label="Hang Up"
          >
            <span className="material-symbols-outlined fill-icon text-[32px]">call_end</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CallUI(props: CallUIProps) {
  const { status } = props;
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

  useEffect(() => {
    if (status === 'RINGING_INBOUND' && 'vibrate' in navigator) {
      navigator.vibrate?.([500, 250, 500, 250, 500]);
    }
    return () => {
      navigator.vibrate?.(0);
    };
  }, [status]);

  return (
    <div className="h-full w-full">
      <audio ref={audioRef} id="remote-audio" autoPlay />
      {status === 'RINGING_INBOUND' && <IncomingCallScreen {...props} />}
      {status === 'RINGING_OUTBOUND' && <CallingScreen {...props} />}
      {(status === 'CONNECTED' || status === 'RECONNECTING') && <ActiveCallScreen {...props} />}
      {status === 'IDLE' && (
        <div className="h-full flex items-center justify-center">
          <p className="font-body-md text-body-md text-on-surface-variant">Idle</p>
        </div>
      )}
    </div>
  );
}