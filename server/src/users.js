import { Router } from 'express';
import db, { get, all, run } from './db.js';
import { requireAuth } from './auth.js';
import { isOnline, sendPresenceTo } from './presence.js';

const router = Router();
router.use(requireAuth);

router.get('/users/me', (req, res) => {
  res.json({ user: req.user });
});

router.get('/users/search', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  const rows = await all(
    `SELECT id, username, display_name FROM users
     WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
     ORDER BY CASE WHEN username = ? THEN 0 ELSE 1 END, username
     LIMIT 10`,
    [`%${q}%`, `%${q}%`, req.user.id, q]
  );
  res.json({ users: rows });
});

router.post('/contacts', async (req, res) => {
  const { contactId } = req.body || {};
  if (!contactId) {
    return res.status(400).json({ error: 'contactId is required' });
  }
  if (contactId === req.user.id) {
    return res.status(400).json({ error: 'You cannot add yourself as a contact' });
  }
  const contact = await get('SELECT id FROM users WHERE id = ?', [contactId]);
  if (!contact) {
    return res.status(404).json({ error: 'User not found' });
  }
  await run('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)', [
    req.user.id,
    contactId
  ]);
  if (isOnline(contactId)) {
    sendPresenceTo(req.user.id, contactId, true);
  }
  res.status(201).json({ ok: true });
});

router.get('/contacts', async (req, res) => {
  const rows = await all(
    `SELECT c.contact_id AS id, u.username, u.display_name, u.last_seen
     FROM contacts c
     JOIN users u ON u.id = c.contact_id
     WHERE c.user_id = ?
     ORDER BY u.display_name COLLATE NOCASE`,
    [req.user.id]
  );
  res.json({ contacts: rows });
});

export default router;