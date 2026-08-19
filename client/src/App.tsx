import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useCallSession, storePendingAccept } from './hooks/useCallSession';
import { setupPushNotifications, removePushNotifications } from './services/push';
import CallUI from './components/CallUI';
import ContactsPanel from './components/ContactsPanel';
import RecentsPanel from './components/RecentsPanel';
import AuthPage from './components/AuthPage';

type Tab = 'contacts' | 'recents';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'recents', label: 'Recents', icon: 'history' },
  { id: 'contacts', label: 'Contacts', icon: 'person' }
];

export default function App() {
  const { user, token, initializing, restore, logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>('contacts');
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

  const {
    status,
    remoteUser,
    error,
    socketState,
    pushRinging,
    muted,
    speakerOn,
    onHold,
    call,
    answer,
    decline,
    hangup,
    toggleMute,
    toggleSpeaker,
    toggleHold
  } = useCallSession(user?.id || '', user?.display_name || '', token);

  const isCallActive =
    status === 'RINGING_OUTBOUND' ||
    status === 'RINGING_INBOUND' ||
    status === 'CONNECTED' ||
    status === 'RECONNECTING';

  async function handleEnableNotifications() {
    setNotifStatus(null);
    const result = await setupPushNotifications();
    setNotifStatus(
      result.enabled
        ? 'Notifications enabled — you can receive calls with the app closed.'
        : `Notifications unavailable: ${result.reason}`
    );
  }

  async function handleLogout() {
    await removePushNotifications();
    logout();
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (!user || !token) {
    return <AuthPage />;
  }

  return (
    <div className="app-shell bg-background text-on-background">
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-container/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-container/5 blur-[100px]" />
      </div>

      {isCallActive ? (
        <CallUI
          status={status}
          remoteName={remoteUser?.name || 'Unknown'}
          onAnswer={answer}
          onDecline={decline}
          onHangup={hangup}
          muted={muted}
          speakerOn={speakerOn}
          onHold={onHold}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onToggleHold={toggleHold}
        />
      ) : (
        <>
          <header className="relative z-10 w-full flex justify-between items-center px-container-margin-mobile pt-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">lock</span>
              <div className="flex items-center gap-2 bg-surface-container/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    socketState === 'open'
                      ? 'bg-secondary'
                      : socketState === 'connecting'
                        ? 'bg-primary'
                        : 'bg-error'
                  }`}
                />
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {socketState === 'open'
                    ? 'Connected'
                    : socketState === 'connecting'
                      ? 'Connecting…'
                      : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface p-2 btn-press"
                onClick={handleEnableNotifications}
                aria-label="Enable Notifications"
              >
                notifications
              </button>
              <button
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface p-2 btn-press"
                onClick={handleLogout}
                aria-label="Log out"
              >
                logout
              </button>
            </div>
          </header>

          <div className="tab-content">
            {pushRinging && (
              <div className="mx-container-margin-mobile mt-4 bg-primary/10 border border-primary/30 text-primary rounded-xl px-4 py-3 font-label-sm text-label-sm">
                Ringing their device... (push notification sent)
              </div>
            )}
            {error && (
              <div className="mx-container-margin-mobile mt-4 bg-error-container/20 border border-error/30 text-on-error-container rounded-xl px-4 py-3 font-label-sm text-label-sm">
                {error}
              </div>
            )}
            {notifStatus && (
              <div className="mx-container-margin-mobile mt-4 bg-surface-container-low/60 border border-white/5 text-on-surface-variant rounded-xl px-4 py-3 font-label-sm text-label-sm">
                {notifStatus}
              </div>
            )}

            {tab === 'contacts' && (
              <ContactsPanel onCall={(id, name) => call(id, name)} />
            )}
            {tab === 'recents' && <RecentsPanel onCall={(id, name) => call(id, name)} />}
          </div>

          <nav className="bg-surface/80 backdrop-blur-xl text-secondary font-label-sm text-label-sm fixed bottom-0 w-full z-50 rounded-t-xl border-t border-white/10 flex justify-around items-center h-20 px-4 pb-[env(safe-area-inset-bottom)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`flex flex-col items-center justify-center transition-all duration-200 w-20 py-1 active:scale-90 ${
                  tab === t.id
                    ? 'text-secondary bg-secondary-container/20 rounded-xl'
                    : 'text-on-surface-variant hover:text-secondary'
                }`}
                onClick={() => setTab(t.id)}
              >
                <span className={`material-symbols-outlined mb-1 ${tab === t.id ? 'fill-icon' : ''}`}>
                  {t.icon}
                </span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}