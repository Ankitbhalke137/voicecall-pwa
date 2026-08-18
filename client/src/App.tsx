import { useState } from 'react';
import { useCallSession } from './hooks/useCallSession';
import CallUI from './components/CallUI';

export default function App() {
  const [userId] = useState(() => {
    let id = sessionStorage.getItem('voicecall-user-id');
    if (!id) {
      id = `user-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('voicecall-user-id', id);
    }
    return id;
  });
  const [userName] = useState(() => {
    let name = sessionStorage.getItem('voicecall-user-name');
    if (!name) {
      name = `User ${userId.slice(5, 9)}`;
      sessionStorage.setItem('voicecall-user-name', name);
    }
    return name;
  });
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');

  const { status, remoteUser, error, call, answer, decline, hangup } = useCallSession(userId, userName);

  const isCallActive =
    status === 'RINGING_OUTBOUND' ||
    status === 'RINGING_INBOUND' ||
    status === 'CONNECTED' ||
    status === 'RECONNECTING';

  return (
    <div className="app">
      <header className="app-header">
        <h1>VoiceCall</h1>
        <div className="user-chip">
          <span className="user-dot" /> {userName}
        </div>
      </header>

      <main className="app-main">
        {isCallActive ? (
          <CallUI
            status={status}
            remoteName={remoteUser?.name || 'Unknown'}
            onAnswer={answer}
            onDecline={decline}
            onHangup={hangup}
          />
        ) : (
          <section className="dialer">
            <h2>Call a friend</h2>
            <p className="hint">
              Your ID: <code>{userId}</code>
              <br />
              <small>Open this app in another tab and use that ID to call yourself.</small>
            </p>

            <label htmlFor="target-id">Target User ID</label>
            <input
              id="target-id"
              type="text"
              value={targetId}
              placeholder="e.g. user-abc123"
              onChange={(e) => setTargetId(e.target.value)}
            />

            <label htmlFor="target-name">Display Name (optional)</label>
            <input
              id="target-name"
              type="text"
              value={targetName}
              placeholder="e.g. John"
              onChange={(e) => setTargetName(e.target.value)}
            />

            {error && <div className="error-banner">{error}</div>}

            <button
              className="btn btn-call"
              disabled={!targetId}
              onClick={() => call(targetId, targetName || `User ${targetId.slice(0, 6)}`)}
            >
              Call
            </button>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>PWA · WebRTC · Free</p>
      </footer>
    </div>
  );
}