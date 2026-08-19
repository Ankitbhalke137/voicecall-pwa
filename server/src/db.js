import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'fs';

const DATA_DIR = new URL('../data/', import.meta.url);
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(new URL('voicecall.db', DATA_DIR));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT
  );

  CREATE TABLE IF NOT EXISTS contacts (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, contact_id)
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;