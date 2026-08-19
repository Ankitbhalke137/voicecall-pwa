import { Router } from 'express';
import db from './db.js';
import { requireAuth } from './auth.js';
import { isOnline, sendPresenceTo } from './presence.js';

const router = Router();
router.use(requireAuth);

router.get('/users/me', (req, res) => {
  res.json({ user: req.user });
});

router.get('/users/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  const rows = db
    .prepare(
      `SELECT id, username, display_name FROM users
       WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
       ORDER BY CASE WHEN username = ? THEN 0 ELSE 1 END, username
       LIMIT 10`
    )
    .all(`%${q}%`, `%${q}%`, req.user.id, q);
  res.json({ users: rows });
});

router.get('/users/all', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, username, display_name FROM users
       WHERE id != ?
       ORDER BY username`
    )
    .all(req.user.id);
  res.json({ users: rows });
});

router.post('/contacts', (req, res) => {
  const { contactId } = req.body || {};
  if (!contactId) {
    return res.status(400).json({ error: 'contactId is required' });
  }
  if (contactId === req.user.id) {
    return res.status(400).json({ error: 'You cannot add yourself as a contact' });
  }
  const contact = db.prepare('SELECT id FROM users WHERE id = ?').get(contactId);
  if (!contact) {
    return res.status(404).json({ error: 'User not found' });
  }
  db.prepare('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)').run(
    req.user.id,
    contactId
  );
  if (isOnline(contactId)) {
    sendPresenceTo(req.user.id, contactId, true);
  }
  res.status(201).json({ ok: true });
});

router.get('/contacts', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.contact_id AS id, u.username, u.display_name, u.last_seen
       FROM contacts c
       JOIN users u ON u.id = c.contact_id
       WHERE c.user_id = ?
       ORDER BY u.display_name COLLATE NOCASE`
    )
    .all(req.user.id);
  res.json({ contacts: rows });
});

export default router;