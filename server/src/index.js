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
import { notifyCallEnded, startBot } from './telegram.js';

ensureVapidKeys();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const offlineBuffers = new Map(); // userId -> { messages: [], expiresAt }
const OFFLINE_BUFFER_TTL_MS = 60_000;
const activeCalls = new Map(); // callId -> { callerId, calleeId, startedAt, answeredAt }

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

app.get('/api/v1/calls', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload?.sub) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const calls = db
    .prepare(
      `SELECT c.call_id, c.caller_id, c.callee_id, c.status, c.started_at, c.answered_at,
              c.ended_at, c.duration_sec,
              u1.display_name AS caller_name, u1.username AS caller_username,
              u2.display_name AS callee_name, u2.username AS callee_username
       FROM call_logs c
       JOIN users u1 ON u1.id = c.caller_id
       JOIN users u2 ON u2.id = c.callee_id
       WHERE c.caller_id = ? OR c.callee_id = ?
       ORDER BY c.id DESC LIMIT ?`
    )
    .all(payload.sub, payload.sub, limit);
  res.json({ calls });
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

function findActiveCallFor(userId) {
  for (const [callId, call] of activeCalls) {
    if (call.callerId === userId || call.calleeId === userId) {
      return { callId, call };
    }
  }
  return null;
}

function finalizeCall(callId, call, status) {
  if (!activeCalls.has(callId)) return;
  activeCalls.delete(callId);
  const answeredAt = call.answeredAt;
  const endedAt = Date.now();
  const durationSec = answeredAt ? Math.round((endedAt - answeredAt) / 1000) : 0;
  const log = {
    call_id: callId,
    caller_id: call.callerId,
    callee_id: call.calleeId,
    status,
    started_at: new Date(call.startedAt).toISOString(),
    answered_at: answeredAt ? new Date(answeredAt).toISOString() : null,
    ended_at: new Date(endedAt).toISOString(),
    duration_sec: status === 'answered' ? durationSec : null
  };
  try {
    db.prepare(
      `INSERT INTO call_logs (call_id, caller_id, callee_id, status, started_at, answered_at, ended_at, duration_sec)
       VALUES (@call_id, @caller_id, @callee_id, @status, @started_at, @answered_at, @ended_at, @duration_sec)`
    ).run(log);
  } catch (err) {
    console.error(`[call] failed to log ${callId}:`, err.message);
  }
  const caller = getUserProfile(call.callerId);
  const callee = getUserProfile(call.calleeId);
  notifyCallEnded({
    ...log,
    caller_name: caller?.display_name || caller?.username || 'Unknown',
    callee_name: callee?.display_name || callee?.username || 'Unknown'
  });
  console.log(`[call] ended ${callId} (${status}, ${log.duration_sec ?? 0}s)`);
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
        activeCalls.set(data.callId, {
          callerId: userId,
          calleeId: data.targetUserId,
          startedAt: Date.now(),
          answeredAt: null
        });
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
        if (data.type === 'CALL_ACCEPTED') {
          const call = activeCalls.get(data.callId);
          if (call) call.answeredAt = Date.now();
        } else {
          const call = activeCalls.get(data.callId);
          if (call) finalizeCall(data.callId, call, 'declined');
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
        const found = data.callId
          ? activeCalls.has(data.callId)
            ? { callId: data.callId, call: activeCalls.get(data.callId) }
            : null
          : findActiveCallFor(userId);
        if (found) {
          const status = found.call.answeredAt ? 'answered' : 'missed';
          finalizeCall(found.callId, found.call, status);
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
  startBot(db);
});