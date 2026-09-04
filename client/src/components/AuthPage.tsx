import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../store/authStore';

export default function AuthPage() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const googleLogin = useAuthStore((s) => s.googleLogin);
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

          <label className="block mb-6">
            <span className="font-label-sm text-label-sm text-on-surface-variant mb-2 block">
              Continue with Google
            </span>
            <button
              type="button"
              onClick={() => googleLogin({ googleId: '' })}
              disabled={busy}
              className="w-full py-3.5 rounded-full bg-white border border-primary/20 text-primary font-label-sm text-label-sm hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.43 12.2c0-.3-.1-.5-.3-.7l-2.3-2.6c-.1-.2-.3-.3-.5-.3-.5 0-.9.4-.9.9v.7c0 .5.5.9.9.9h.8c.6 0 1 .9 1 1v5c0 .7-.2 1.3-.6 1.8l-2.6 2.3c-.2.3-.5.5-.8.5-.5 0-1-.3-1-.8l-6.4-7.3c-.4-.5-1.1-.9-1.9-.9-1.1 0-2.1.5-2.8 1.3l-.5.3-4.4 4.4c-.5.5-.7 1.2-.7 2 0 .7.3 1.4.7 2l1.8 1.8c.4.4 1 .7 1.9.7s1.5-.3 1.9-.7l1.8-1.8c.5-.5.5-1.2.7-1.9zM7.7 4.8l4.2 4.7-4.2 4.7L7.7 20.5l4.7-4.2-4.7-4.2zm4.1 15.4l-1.9-2.1L9.9 5.6l1.9 2.1l4.3 4.8-4.3 4.8zM7.7 7.5l1.9 2.1L7 12.6l1.9-2.1l-1.9-2.1zm15.6-15.4L5.4 11.9l1.9 2.1h-3.8l1.8 2H21.7z"/>
              </svg>
              Continue with Google
            </button>
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