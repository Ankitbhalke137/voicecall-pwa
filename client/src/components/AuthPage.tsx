import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../store/authStore';

export default function AuthPage() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password, displayName || username);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>VoiceCall</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Display Name
              <input
                type="text"
                value={displayName}
                placeholder="What friends see when you call"
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
          )}

          <label>
            Username
            <input
              type="text"
              value={username}
              placeholder={mode === 'login' ? 'e.g. john' : '3-24 chars: letters, numbers, _ -'}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <div className="error-banner">{error}</div>}

          <button className="btn btn-call btn-block" type="submit" disabled={busy || !username || !password}>
            {busy ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <button className="btn btn-ghost" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}