import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import db, { run, get } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'voicecall-dev-secret-change-me';
const JWT_EXPIRES_IN = '30d';

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    get('SELECT id, username, display_name, created_at, last_seen FROM users WHERE id = ?', [payload.sub])
      .then(user => {
        if (!user) {
          return res.status(401).json({ error: 'User no longer exists' });
        }
        req.user = user;
        next();
      })
      .catch(() => res.status(401).json({ error: 'Invalid or expired token' }));
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

const router = Router();

router.post('/register', async (req, res) => {
  const { username, password, displayName } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const normalized = String(username).trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,24}$/.test(normalized)) {
    return res.status(400).json({
      error: 'Username must be 3-24 chars: letters, numbers, _ or -'
    });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const existing = await get('SELECT id FROM users WHERE username = ?', [normalized]);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const id = randomUUID();
  const hash = bcrypt.hashSync(String(password), 10);
  await run(
    'INSERT INTO users (id, username, display_name, password_hash) VALUES (?, ?, ?, ?)',
    [id, normalized, String(displayName || normalized).slice(0, 40), hash]
  );

  const user = { id, username: normalized, display_name: String(displayName || normalized).slice(0, 40) };
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const row = await get('SELECT * FROM users WHERE username = ?', [String(username).trim().toLowerCase()]);
  if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const user = {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    created_at: row.created_at,
    last_seen: row.last_seen
  };
  res.json({ token: signToken(user), user });
});

export default router;