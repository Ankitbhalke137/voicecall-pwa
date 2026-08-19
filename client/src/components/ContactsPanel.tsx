import { useEffect, useState } from 'react';
import { useContactsStore } from '../store/contactsStore';

interface ContactsPanelProps {
  onCall: (userId: string, displayName: string) => void;
}

export default function ContactsPanel({ onCall }: ContactsPanelProps) {
  const { contacts, presence, searchResults, loading, load, search, clearSearch, add } =
    useContactsStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(q: string) {
    setQuery(q);
    await search(q);
  }

  return (
    <section className="contacts-panel">
      <div className="search-box">
        <input
          type="text"
          value={query}
          placeholder="Search users by username..."
          onChange={(e) => handleSearch(e.target.value)}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              clearSearch();
            }}
          >
            ×
          </button>
        )}
      </div>

      {searchResults.length > 0 && (
        <ul className="search-results">
          {searchResults.map((u) => (
            <li key={u.id} className="search-result">
              <div className="avatar">{u.display_name.charAt(0).toUpperCase()}</div>
              <div className="search-result-info">
                <span className="contact-name">{u.display_name}</span>
                <span className="contact-username">@{u.username}</span>
              </div>
              <button className="btn btn-add" onClick={() => add(u.id)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>Contacts</h2>
      {loading && <p className="hint">Loading contacts...</p>}
      {!loading && contacts.length === 0 && (
        <p className="hint">
          No contacts yet. Search for a username above to add your first contact.
        </p>
      )}
      <ul className="contact-list">
        {contacts.map((c) => (
          <li key={c.id} className="contact-item">
            <span className={`presence-dot ${presence[c.id] ? 'online' : 'offline'}`} />
            <div className="avatar">{c.display_name.charAt(0).toUpperCase()}</div>
            <div className="contact-info">
              <span className="contact-name">{c.display_name}</span>
              <span className="contact-username">@{c.username}</span>
            </div>
            <button className="btn btn-call-small" onClick={() => onCall(c.id, c.display_name)}>
              Call
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}