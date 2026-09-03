import WebSocket from 'ws';
import db from '../src/db.js';

const WS_URL = 'ws://localhost:8080/ws';

const results = [];
function log(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`);
}

function connect(userId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?userId=${userId}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function waitFor(ws, type, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`Timeout waiting for ${type}`));
    }, timeoutMs);
    const handler = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === type) {
        clearTimeout(timer);
        ws.off('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

async function main() {
  db.prepare(`INSERT OR IGNORE INTO users (id, username, display_name, password_hash) VALUES ('q-user-1', 'q-user-1', 'Q User 1', 'hash')`).run();
  db.prepare(`INSERT OR IGNORE INTO users (id, username, display_name, password_hash) VALUES ('q-user-2', 'q-user-2', 'Q User 2', 'hash')`).run();

  const user1 = await connect('q-user-1');
  const user2 = await connect('q-user-2');

  const callId = `quality-call-${Date.now()}`;
  const incomingPromise = waitFor(user2, 'INCOMING_CALL');
  user1.send(JSON.stringify({ type: 'INITIATE_CALL', targetUserId: 'q-user-2', callId }));
  await incomingPromise;

  const acceptedPromise = waitFor(user1, 'CALL_ACCEPTED');
  user2.send(JSON.stringify({ type: 'CALL_ACCEPTED', callId, targetUserId: 'q-user-1' }));
  await acceptedPromise;

  // Send quality metrics signal
  user1.send(JSON.stringify({
    type: 'QUALITY_METRICS',
    targetUserId: 'q-user-2',
    callId,
    metrics: { jitter: 12, packetLoss: 0.01, rtt: 45, qualityScore: 0.95, qualityLabel: 'Excellent' }
  }));

  user2.send(JSON.stringify({
    type: 'QUALITY_METRICS',
    targetUserId: 'q-user-1',
    callId,
    metrics: { jitter: 15, packetLoss: 0.02, rtt: 50, qualityScore: 0.9, qualityLabel: 'Excellent' }
  }));

  await new Promise((r) => setTimeout(r, 200));

  const hangupPromise = waitFor(user2, 'HANGUP');
  user1.send(JSON.stringify({ type: 'HANGUP', targetUserId: 'q-user-2', callId }));
  await hangupPromise;

  await new Promise((r) => setTimeout(r, 300));

  const logRow = db.prepare('SELECT * FROM call_logs WHERE call_id = ?').get(callId);
  log(
    'Quality metrics stored in call_logs',
    !!logRow && typeof logRow.quality_score === 'number' && logRow.quality_score > 0.8,
    JSON.stringify(logRow)
  );

  user1.close();
  user2.close();

  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('Quality test crashed:', err);
  process.exit(1);
});
