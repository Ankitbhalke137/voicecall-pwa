import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import db from './db.js';
import authRouter, { verifyToken } from './auth.js';
import usersRouter from './users.js';
import pushRouter, { ensureVapidKeys, sendPushToUser } from './push.js';
import { activeConnections, sendTo, sendPresenceTo } from './presence.js';

ensureVapidKeys();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const offlineBuffers = new Map(); // userId -> { messages: [], expiresAt }
const OFFLINE_BUFFER_TTL_MS = 60_000;

app.get('/certs/rootCA.pem', (req, res) => {
  try {
    const pem = readFileSync(new URL('../../certs/rootCA.pem', import.meta.url));
    res.type('application/x-pem-file').send(pem);
  } catch (err) {
    res.status(404).json({ error: 'CA cert not found' });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeConnections: activeConnections.size
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1', usersRouter);
app.use('/api/v1/push', pushRouter);

app.post('/api/v1/calls/reject', (req, res) => {
  res.json({ ok: true });
});

function resolveUserIdFromRequest(req) {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  if (token) {
    const payload = verifyToken(token);
    if (payload?.sub) return payload.sub;
  }
  return url.searchParams.get('userId');
}

function getUserProfile(userId) {
  return db
    .prepare('SELECT id, username, display_name FROM users WHERE id = ?')
    .get(userId);
}

function getContactIds(userId) {
  return db
    .prepare('SELECT contact_id FROM contacts WHERE user_id = ?')
    .all(userId)
    .map((r) => r.contact_id);
}

function getUsersWithContact(contactId) {
  return db
    .prepare('SELECT user_id FROM contacts WHERE contact_id = ?')
    .all(contactId)
    .map((r) => r.user_id);
}

function broadcastPresence(userId, online) {
  const watchers = getUsersWithContact(userId);
  if (!watchers.length) return;
  for (const watcherId of watchers) {
    sendPresenceTo(watcherId, userId, online);
  }
}

function bufferForOfflineUser(userId) {
  if (!offlineBuffers.has(userId)) {
    offlineBuffers.set(userId, {
      messages: [],
      expiresAt: Date.now() + OFFLINE_BUFFER_TTL_MS
    });
  }
  return offlineBuffers.get(userId);
}

function flushOfflineBuffer(userId) {
  const buffered = offlineBuffers.get(userId);
  if (!buffered) return;
  offlineBuffers.delete(userId);
  const ws = activeConnections.get(userId);
  if (!ws) return;
  for (const msg of buffered.messages) {
    sendTo(ws, msg);
  }
  if (buffered.messages.length) {
    console.log(`[buffer] flushed ${buffered.messages.length} messages to ${userId}`);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, buffered] of offlineBuffers) {
    if (buffered.expiresAt < now) {
      offlineBuffers.delete(userId);
    }
  }
}, 30_000);

wss.on('connection', (ws, req) => {
  const userId = resolveUserIdFromRequest(req);
  if (!userId) {
    ws.close(4001, 'Missing userId or token');
    return;
  }

  activeConnections.set(userId, ws);
  db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);
  broadcastPresence(userId, true);
  flushOfflineBuffer(userId);
  console.log(`[+] ${userId} connected (${activeConnections.size} active)`);

  ws.on('message', async (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch (err) {
      sendTo(ws, { type: 'ERROR', message: 'Invalid JSON' });
      return;
    }

    switch (data.type) {
      case 'INITIATE_CALL': {
        const caller = getUserProfile(userId);
        const target = activeConnections.get(data.targetUserId);
        if (target && target.readyState === WebSocket.OPEN) {
          sendTo(target, {
            type: 'INCOMING_CALL',
            callerId: userId,
            callerName: caller?.display_name || `User ${userId.slice(0, 6)}`,
            callId: data.callId
          });
          console.log(`[call] ${userId} -> ${data.targetUserId} (socket)`);
        } else {
          const result = await sendPushToUser(data.targetUserId, {
            type: 'INCOMING_CALL',
            callId: data.callId,
            callerId: userId,
            callerName: caller?.display_name || `User ${userId.slice(0, 6)}`
          });
          if (result.status === 'no-subscription' || result.status === 'expired') {
            sendTo(ws, {
              type: 'ERROR',
              message: 'Target user is offline and cannot receive push notifications'
            });
            console.log(`[call] ${userId} -> ${data.targetUserId} (OFFLINE, no push)`);
          } else {
            sendTo(ws, { type: 'CALL_PUSHED', callId: data.callId });
            console.log(`[call] ${userId} -> ${data.targetUserId} (push, ${result.status})`);
          }
        }
        break;
      }

      case 'CALL_ACCEPTED':
      case 'CALL_REJECTED': {
        const target = activeConnections.get(data.targetUserId);
        if (target && target.readyState === WebSocket.OPEN) {
          const type = data.type === 'CALL_ACCEPTED' ? 'CALL_ACCEPTED' : 'CALL_REJECTED';
          sendTo(target, { type, callId: data.callId, senderId: userId });
        }
        break;
      }

      case 'SDP_OFFER':
      case 'SDP_ANSWER':
      case 'ICE_CANDIDATE': {
        const target = activeConnections.get(data.targetUserId);
        if (target && target.readyState === WebSocket.OPEN) {
          sendTo(target, { ...data, senderId: userId });
        } else {
          bufferForOfflineUser(data.targetUserId).messages.push({ ...data, senderId: userId });
        }
        break;
      }

      case 'HANGUP': {
        const target = activeConnections.get(data.targetUserId);
        if (target && target.readyState === WebSocket.OPEN) {
          sendTo(target, { type: 'HANGUP', senderId: userId });
        }
        break;
      }

      default:
        sendTo(ws, { type: 'ERROR', message: `Unknown message type: ${data.type}` });
    }
  });

  ws.on('close', () => {
    if (userId && activeConnections.get(userId) === ws) {
      activeConnections.delete(userId);
      broadcastPresence(userId, false);
    }
    console.log(`[-] ${userId} disconnected (${activeConnections.size} active)`);
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`[server] Signaling server running on ws://localhost:${PORT}/ws`);
  console.log(`[server] Health check at http://localhost:${PORT}/health`);
});