import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useCallSession, storePendingAccept } from './hooks/useCallSession';
import { setupPushNotifications, removePushNotifications } from './services/push';
import CallUI from './components/CallUI';
import ContactsPanel from './components/ContactsPanel';
import AuthPage from './components/AuthPage';

export default function App() {
  const { user, token, initializing, restore, logout } = useAuthStore();
  const [targetId, setTargetId] = useState('');
  const [notifStatus, setNotifStatus] = useState<string | null>(null);

  useEffect(() => {
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callId = params.get('callId');
    const callerId = params.get('callerId');
    if (callId && callerId) {
      storePendingAccept(callerId, callId);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'ACCEPT_CALL_FROM_SW' && event.data.callId && event.data.callerId) {
        storePendingAccept(event.data.callerId, event.data.callId);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  const { status, remoteUser, error, socketState, pushRinging, call, answer, decline, hangup } =
    useCallSession(user?.id || '', user?.display_name || '', token);

  const isCallActive =
    status === 'RINGING_OUTBOUND' ||
    status === 'RINGING_INBOUND' ||
    status === 'CONNECTED' ||
    status === 'RECONNECTING';

  const socketLabel: Record<string, { text: string; cls: string }> = {
    connecting: { text: 'Connecting…', cls: 'socket-connecting' },
    open: { text: 'Server connected', cls: 'socket-open' },
    closed: { text: 'Server disconnected', cls: 'socket-closed' },
    error: { text: 'Connection error', cls: 'socket-closed' }
  };
  const socketInfo = socketLabel[socketState];

  async function handleEnableNotifications() {
    setNotifStatus(null);
    const result = await setupPushNotifications();
    setNotifStatus(result.enabled ? 'Notifications enabled — you can receive calls with the app closed.' : `Notifications unavailable: ${result.reason}`);
  }

  async function handleLogout() {
    await removePushNotifications();
    logout();
  }

  if (initializing) {
    return (
      <div className="app">
        <div className="app-main centered">
          <p className="hint">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <AuthPage />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>VoiceCall</h1>
        <div className="header-right">
          <div className="user-chip">
            <span className={`socket-dot ${socketInfo.cls}`} /> {socketInfo.text}
          </div>
          <div className="user-chip">
            @{user.username}
            <button className="btn btn-link" onClick={handleLogout}>
              Log out
            </button>
          </div>
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
          <>
            {pushRinging && (
              <div className="notice-banner">Ringing their device... (push notification sent)</div>
            )}
            {error && <div className="error-banner">{error}</div>}
            <div className="content-grid">
              <ContactsPanel onCall={(id, name) => call(id, name)} />

              <section className="dialer">
                <h2>Call by ID</h2>
                <p className="hint">
                  <small>Quick manual dialing — paste another user's ID to call them.</small>
                </p>
                <label htmlFor="target-id">User ID</label>
                <input
                  id="target-id"
                  type="text"
                  value={targetId}
                  placeholder="e.g. 8f3a...uuid"
                  onChange={(e) => setTargetId(e.target.value)}
                />
                <button
                  className="btn btn-call btn-block"
                  disabled={!targetId}
                  onClick={() => call(targetId, `User ${targetId.slice(0, 6)}`)}
                >
                  Call
                </button>

                <hr className="divider" />

                <h3>Incoming call notifications</h3>
                <p className="hint">
                  <small>
                    Receive call alerts even when the app is closed or on another tab (Web Push).
                  </small>
                </p>
                <button className="btn btn-ghost btn-block" onClick={handleEnableNotifications}>
                  Enable Notifications
                </button>
                {notifStatus && <p className={`hint ${notifStatus.startsWith('Notifications enabled') ? 'ok-text' : ''}`}>{notifStatus}</p>}
              </section>
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>PWA · WebRTC · Free · Self-hosted</p>
      </footer>
    </div>
  );
}