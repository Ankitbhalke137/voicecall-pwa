import { WebSocket } from 'ws';

export const activeConnections = new Map(); // userId -> WebSocket

export function sendTo(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function isOnline(userId) {
  const ws = activeConnections.get(userId);
  return Boolean(ws && ws.readyState === WebSocket.OPEN);
}

export function sendPresenceTo(userId, contactId, online) {
  const ws = activeConnections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendTo(ws, { type: 'PRESENCE_UPDATE', userId: contactId, online });
  }
}