export interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  created_at?: string;
  last_seen?: string | null;
}

export interface Contact {
  id: string;
  username: string;
  display_name: string;
  last_seen?: string | null;
}

export interface PushKeys {
  p256dh: string;
  auth: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('voicecall-token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Request failed (${res.status})`);
  }
  return json as T;
}

export const api = {
  register(username: string, password: string, displayName: string) {
    return request<{ token: string; user: AuthUser }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName })
    });
  },
  login(username: string, password: string) {
    return request<{ token: string; user: AuthUser }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  me() {
    return request<{ user: AuthUser }>('/api/v1/users/me');
  },
  searchUsers(q: string) {
    return request<{ users: AuthUser[] }>(`/api/v1/users/search?q=${encodeURIComponent(q)}`);
  },
  addContact(contactId: string) {
    return request<{ ok: boolean }>('/api/v1/contacts', {
      method: 'POST',
      body: JSON.stringify({ contactId })
    });
  },
  getContacts() {
    return request<{ contacts: Contact[] }>('/api/v1/contacts');
  },
  vapidPublicKey() {
    return request<{ publicKey: string }>('/api/v1/push/vapid-public-key');
  },
  subscribePush(subscription: PushSubscription) {
    return request<{ ok: boolean }>('/api/v1/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription.toJSON())
    });
  },
  unsubscribePush() {
    return request<{ ok: boolean }>('/api/v1/push/subscribe', { method: 'DELETE' });
  }
};