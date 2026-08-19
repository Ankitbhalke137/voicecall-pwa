import { createClient } from '@libsql/client';
import { resolve } from 'path';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// Support local SQLite file for testing when TURSO_DATABASE_URL is not set
const isLocal = !url || url.startsWith('file:');
const clientUrl = url || `file:${resolve('voicecall.db')}`;

export const db = createClient({ url: clientUrl, authToken });

// Helper to mimic synchronous SQLite API for existing code
export function run(sql, params = []) {
  return db.execute({ sql, args: params }).then(r => ({ changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid }));
}

export function get(sql, params = []) {
  return db.execute({ sql, args: params }).then(r => r.rows[0] || null);
}

export function all(sql, params = []) {
  return db.execute({ sql, args: params }).then(r => r.rows);
}

export function exec(sql) {
  return db.execute({ sql, args: [] }).then(() => ({}));
}

// Initialize schema
export async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS contacts (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, contact_id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id TEXT UNIQUE NOT NULL,
      caller_id TEXT NOT NULL REFERENCES users(id),
      callee_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL CHECK (status IN ('answered', 'declined', 'missed')),
      started_at TEXT NOT NULL,
      answered_at TEXT,
      ended_at TEXT,
      duration_sec INTEGER
    )
  `);
}

initDb().catch(console.error);

export default db;