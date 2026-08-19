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
    <div className="min-h-screen bg-background text-on-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-container/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-container/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm glass-panel rounded-[24px] p-8 text-center">
        <h1 className="text-3xl font-bold text-primary mb-1">VoiceCall</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="text-left">
          {mode === 'register' && (
            <label className="block mb-4">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-2 block">
                Display Name
              </span>
              <input
                type="text"
                value={displayName}
                placeholder="What friends see when you call"
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-surface-container-low/60 border border-white/5 rounded-xl px-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors"
              />
            </label>
          )}

          <label className="block mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant mb-2 block">
              Username
            </span>
            <input
              type="text"
              value={username}
              placeholder={mode === 'login' ? 'e.g. john' : '3-24 chars: letters, numbers, _ -'}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-container-low/60 border border-white/5 rounded-xl px-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors"
            />
          </label>

          <label className="block mb-6">
            <span className="font-label-sm text-label-sm text-on-surface-variant mb-2 block">
              Password
            </span>
            <input
              type="password"
              value={password}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low/60 border border-white/5 rounded-xl px-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors"
            />
          </label>

          {error && (
            <div className="bg-error-container/20 border border-error/30 text-on-error-container rounded-xl px-4 py-3 font-label-sm text-label-sm mb-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="w-full py-3.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm hover:bg-primary-fixed-dim active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <button
          className="mt-5 font-label-sm text-label-sm text-primary hover:text-primary-fixed transition-colors"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}