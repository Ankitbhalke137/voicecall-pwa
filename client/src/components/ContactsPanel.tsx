import { useEffect, useState } from 'react';
import { useContactsStore } from '../store/contactsStore';

interface ContactsPanelProps {
  onCall: (userId: string, displayName: string) => void;
}

export default function ContactsPanel({ onCall }: ContactsPanelProps) {
  const { contacts, presence, searchResults, allUsers, loading, load, search, clearSearch, add, loadAllUsers } =
    useContactsStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    load();
    loadAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length >= 2) {
      await search(q);
    }
  }

  const displayUsers = query.trim() ? searchResults : allUsers;

  return (
    <div className="flex-1 w-full max-w-md mx-auto pt-6 pb-32 px-container-margin-mobile">
      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">
          search
        </span>
        <input
          type="text"
          value={query}
          placeholder="Search users by username..."
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-surface-container-low/50 backdrop-blur-md border border-white/5 rounded-full pl-12 pr-12 py-3 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors"
        />
        {query && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xl"
            onClick={() => {
              setQuery('');
              clearSearch();
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {displayUsers.length > 0 && (
        <ul className="search-results bg-surface-container-low/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden mb-4">
          {displayUsers.map((u) => (
            <li
              key={u.id}
              className="search-result flex items-center gap-3 p-4 border-b border-white/5 last:border-b-0"
            >
              <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                {u.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-md text-on-surface truncate">{u.display_name}</p>
                <p className="font-label-sm text-label-sm text-outline">@{u.username}</p>
              </div>
              <button
                className="px-4 py-2 rounded-full bg-primary/15 text-primary font-label-sm text-label-sm hover:bg-primary/25 active:scale-95 transition-all"
                onClick={() => add(u.id)}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">
        Contacts
      </h2>
      {loading && <p className="text-body-md text-on-surface-variant">Loading contacts...</p>}
      {!loading && contacts.length === 0 && displayUsers.length === 0 && (
        <p className="text-body-md text-on-surface-variant">
          No users found.
        </p>
      )}
      <ul className="bg-surface-container-low/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
        {contacts.map((c) => (
          <li
            key={c.id}
            className="contact-item flex items-center gap-3 p-4 border-b border-white/5 last:border-b-0"
          >
            <span
              className={`presence-dot w-2.5 h-2.5 min-w-[10px] rounded-full ${
                presence[c.id] ? 'online bg-secondary shadow-[0_0_6px_rgba(74,225,118,0.8)]' : 'bg-outline'
              }`}
            />
            <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {c.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-md text-on-surface truncate">{c.display_name}</p>
              <p className="font-label-sm text-label-sm text-outline">@{c.username}</p>
            </div>
            <button
              className="w-11 h-11 rounded-full bg-secondary text-on-secondary flex items-center justify-center active:scale-90 transition-transform"
              onClick={() => onCall(c.id, c.display_name)}
              aria-label="Call"
            >
              <span className="material-symbols-outlined fill-icon">call</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}