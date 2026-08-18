import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { randomUUID } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

const activeConnections = new Map(); // userId -> WebSocket

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeConnections: activeConnections.size
  });
});

app.get('/api/v1/calls/reject', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/v1/calls/reject', (req, res) => {
  res.json({ ok: true });
});

wss.on('connection', (ws, req) => {
  let userId = null;

  const url = new URL(req.url, 'http://localhost');
  userId = url.searchParams.get('userId');

  if (!userId) {
    ws.close(4001, 'Missing userId');
    return;
  }

  const existing = activeConnections.get(userId);
  if (existing && existing.readyState === WebSocket.OPEN) {
    existing.close(4002, 'New connection for same user');
  }
  activeConnections.set(userId, ws);
  console.log(`[+] ${userId} connected (${activeConnections.size} active)`);

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch (err) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' }));
      return;
    }

    switch (data.type) {
      case 'INITIATE_CALL': {
        const target = activeConnections.get(data.targetUserId);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({
            type: 'INCOMING_CALL',
            callerId: userId,
            callerName: `User ${userId.slice(0, 6)}`,
            callId: data.callId
          }));
          console.log(`[call] ${userId} -> ${data.targetUserId} (socket)`);
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Target user is offline or not found' }));
          console.log(`[call] ${userId} -> ${data.targetUserId} (OFFLINE)`);
        }
        break;
      }

      case 'CALL_ACCEPTED':
      case 'CALL_REJECTED': {
        broadcastToCallers(ws, userId, data);
        break;
      }

      case 'SDP_OFFER':
      case 'SDP_ANSWER':
      case 'ICE_CANDIDATE': {
        const target = activeConnections.get(data.targetUserId);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ ...data, senderId: userId }));
        }
        break;
      }

      case 'HANGUP': {
        const target = activeConnections.get(data.targetUserId);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ type: 'HANGUP', senderId: userId }));
        }
        break;
      }

      default:
        ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown message type: ${data.type}` }));
    }
  });

  ws.on('close', () => {
    if (userId && activeConnections.get(userId) === ws) {
      activeConnections.delete(userId);
    }
    console.log(`[-] ${userId} disconnected (${activeConnections.size} active)`);
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

function broadcastToCallers(ws, userId, data) {
  const type = data.type === 'CALL_ACCEPTED' ? 'CALL_ACCEPTED' : 'CALL_REJECTED';
  const target = activeConnections.get(data.targetUserId);
  if (target && target.readyState === WebSocket.OPEN) {
    target.send(JSON.stringify({ type, callId: data.callId, senderId: userId }));
  }
}

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`[server] Signaling server running on ws://localhost:${PORT}/ws`);
  console.log(`[server] Health check at http://localhost:${PORT}/health`);
});