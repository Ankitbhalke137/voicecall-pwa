import { Router } from 'express';
import webpush from 'web-push';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import db from './db.js';
import { requireAuth } from './auth.js';

const VAPID_FILE = new URL('../vapid.json', import.meta.url);
const VAPID_SUBJECT = 'mailto:admin@voicecall.local';

export function ensureVapidKeys() {
  if (existsSync(VAPID_FILE)) {
    const keys = JSON.parse(readFileSync(VAPID_FILE, 'utf8'));
    webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
    return keys;
  }
  const keys = webpush.generateVAPIDKeys();
  writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), { mode: 0o600 });
  webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
  console.log('[vapid] Generated new VAPID keys -> vapid.json');
  return keys;
}

export async function sendPushToUser(userId, payload) {
  const sub = db
    .prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?')
    .get(userId);
  if (!sub) return { status: 'no-subscription' };
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      },
      JSON.stringify(payload),
      { TTL: 60 }
    );
    return { status: 'delivered' };
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId);
      console.log(`[push] subscription expired for ${userId}, removed`);
      return { status: 'expired' };
    }
    console.error('[push] send failed (best effort):', err.statusCode, err.message);
    return { status: 'best-effort' };
  }
}

const router = Router();
router.use(requireAuth);

router.get('/vapid-public-key', (_req, res) => {
  const keys = JSON.parse(readFileSync(VAPID_FILE, 'utf8'));
  res.json({ publicKey: keys.publicKey });
});

router.post('/subscribe', (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'endpoint, keys.p256dh and keys.auth are required' });
  }
  db.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       endpoint = excluded.endpoint,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       updated_at = datetime('now')`
  ).run(req.user.id, endpoint, keys.p256dh, keys.auth);
  res.status(201).json({ ok: true });
});

router.delete('/subscribe', (req, res) => {
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

export default router;