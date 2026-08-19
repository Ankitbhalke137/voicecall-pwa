import WebSocket from 'ws';
import { createServer } from 'http';
import { createECDH, randomBytes } from 'crypto';

const BASE = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080/ws';

function fakePushKeys() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    p256dh: ecdh.getPublicKey('base64'),
    auth: randomBytes(16).toString('base64')
  };
}

const results = [];
function log(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`);
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

function connectWs(query) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?${query}`);
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
  const fakePush = createServer((req, res) => {
    req.resume();
    res.writeHead(201, { 'Content-Type': 'text/plain' });
    res.end('ok');
  });
  await new Promise((resolve) => fakePush.listen(0, '127.0.0.1', resolve));
  const fakePushUrl = `http://127.0.0.1:${fakePush.address().port}/push`;

  const suffix = Date.now().toString(36);
  const username = `tester_${suffix}`;
  const password = 'phase2pass123';
  const displayName = 'Test User';

  // --- Auth ---
  const reg = await api('POST', '/api/v1/auth/register', {
    body: { username, password, displayName }
  });
  log('Register returns token + user', reg.status === 201 && !!reg.json?.token, `status=${reg.status}`);
  const token = reg.json.token;
  const userId = reg.json.user.id;

  const dup = await api('POST', '/api/v1/auth/register', {
    body: { username, password, displayName }
  });
  log('Duplicate username rejected (409)', dup.status === 409);

  const login = await api('POST', '/api/v1/auth/login', { body: { username, password } });
  log('Login returns token', login.status === 200 && !!login.json?.token);

  const badLogin = await api('POST', '/api/v1/auth/login', {
    body: { username, password: 'wrongpass123' }
  });
  log('Bad password rejected (401)', badLogin.status === 401);

  const me = await api('GET', '/api/v1/users/me', { token });
  log('GET /users/me with token', me.status === 200 && me.json?.user?.id === userId);

  const noAuth = await api('GET', '/api/v1/users/me');
  log('Protected route rejects missing token (401)', noAuth.status === 401);

  // --- Second user + contacts ---
  const reg2 = await api('POST', '/api/v1/auth/register', {
    body: { username: `tester2_${suffix}`, password, displayName: 'Bob' }
  });
  const token2 = reg2.json.token;
  const userId2 = reg2.json.user.id;

  const search = await api('GET', `/api/v1/users/search?q=${username}`, { token: token2 });
  const found = search.json?.users?.some((u) => u.id === userId);
  log('Search finds user by username', search.status === 200 && found);

  const add = await api('POST', '/api/v1/contacts', { token: token2, body: { contactId: userId } });
  log('Add contact succeeds', add.status === 201);

  const addSelf = await api('POST', '/api/v1/contacts', { token: token2, body: { contactId: userId2 } });
  log('Adding self rejected (400)', addSelf.status === 400);

  const list = await api('GET', '/api/v1/contacts', { token: token2 });
  const hasContact = list.json?.contacts?.some((c) => c.id === userId);
  log('Contact list includes added user', list.status === 200 && hasContact);

  // --- Push subscription ---
  const sub = await api('POST', '/api/v1/push/subscribe', {
    token: token2,
    body: {
      endpoint: `https://fcm.example.com/push/${suffix}`,
      keys: fakePushKeys()
    }
  });
  log('Push subscription stored', sub.status === 201);

  const vapid = await api('GET', '/api/v1/push/vapid-public-key', { token: token2 });
  log('VAPID public key served', vapid.status === 200 && typeof vapid.json?.publicKey === 'string');

  // --- Presence over WebSocket (JWT auth) ---
  const ws2 = await connectWs(`token=${encodeURIComponent(token2)}`);
  const presencePromise = waitFor(ws2, 'PRESENCE_UPDATE');
  const ws1 = await connectWs(`token=${encodeURIComponent(token)}`);
  const presence = await presencePromise;
  log('Contact sees PRESENCE_UPDATE when peer connects', presence.userId === userId && presence.online === true);

  // --- Incoming call routed over socket ---
  const incomingPromise = waitFor(ws2, 'INCOMING_CALL');
  ws1.send(
    JSON.stringify({
      type: 'INITIATE_CALL',
      targetUserId: userId2,
      callId: `call-phase2-${suffix}`
    })
  );
  const incoming = await incomingPromise;
  log(
    'INCOMING_CALL delivered with caller name',
    incoming.callerId === userId && typeof incoming.callerName === 'string',
    `callerName=${incoming.callerName}`
  );

  // --- Offline target falls back to push ---
  const offline = await api('POST', '/api/v1/auth/register', {
    body: { username: `tester3_${suffix}`, password, displayName: 'Cara' }
  });
  const token3 = offline.json.token;
  const userId3 = offline.json.user.id;
  await api('POST', '/api/v1/push/subscribe', {
    token: token3,
    body: {
      endpoint: `${fakePushUrl}/offline-${suffix}`,
      keys: fakePushKeys()
    }
  });

  const pushedPromise = waitFor(ws1, 'CALL_PUSHED');
  ws1.send(
    JSON.stringify({
      type: 'INITIATE_CALL',
      targetUserId: userId3,
      callId: `call-push-${suffix}`
    })
  );
  const pushed = await pushedPromise;
  log('Offline call routes to push (CALL_PUSHED)', pushed.callId === `call-push-${suffix}`);

  // --- Presence offline event ---
  const offlinePresencePromise = waitFor(ws2, 'PRESENCE_UPDATE');
  ws1.close();
  const offlinePresence = await offlinePresencePromise;
  log('Contact sees PRESENCE_UPDATE on disconnect', offlinePresence.online === false);

  // --- Call tracking: answered call ---
  const wsA = await connectWs(`token=${encodeURIComponent(token)}`);
  const wsB = await connectWs(`token=${encodeURIComponent(token2)}`);
  const incomingB = waitFor(wsB, 'INCOMING_CALL');
  const answeredCallId = `call-answered-${suffix}`;
  wsA.send(
    JSON.stringify({ type: 'INITIATE_CALL', targetUserId: userId2, callId: answeredCallId })
  );
  await incomingB;
  const acceptedA = waitFor(wsA, 'CALL_ACCEPTED');
  wsB.send(JSON.stringify({ type: 'CALL_ACCEPTED', targetUserId: userId, callId: answeredCallId }));
  await acceptedA;
  await new Promise((r) => setTimeout(r, 700));
  const hangupB = waitFor(wsB, 'HANGUP');
  wsA.send(JSON.stringify({ type: 'HANGUP', targetUserId: userId2, callId: answeredCallId }));
  await hangupB;
  await new Promise((r) => setTimeout(r, 300));
  const callLogs = await api('GET', '/api/v1/calls', { token: token2 });
  const answered = callLogs.json?.calls?.find((c) => c.call_id === answeredCallId);
  log(
    'Answered call logged with duration',
    callLogs.status === 200 &&
      answered?.status === 'answered' &&
      typeof answered?.duration_sec === 'number',
    JSON.stringify(answered)
  );

  // --- Call tracking: declined call ---
  const incomingB2 = waitFor(wsB, 'INCOMING_CALL');
  const declinedCallId = `call-declined-${suffix}`;
  wsA.send(
    JSON.stringify({ type: 'INITIATE_CALL', targetUserId: userId2, callId: declinedCallId })
  );
  await incomingB2;
  wsB.send(
    JSON.stringify({ type: 'CALL_REJECTED', targetUserId: userId, callId: declinedCallId })
  );
  await new Promise((r) => setTimeout(r, 300));
  const callLogs2 = await api('GET', '/api/v1/calls', { token });
  const declined = callLogs2.json?.calls?.find((c) => c.call_id === declinedCallId);
  log('Declined call logged', declined?.status === 'declined', JSON.stringify(declined));

  // --- Telegram formatter unit test ---
  const { formatCallMessage, formatDuration, isConfigured } = await import('../src/telegram.js');
  const formatted = formatCallMessage({
    status: 'answered',
    caller_name: 'Alice',
    callee_name: 'Bob',
    duration_sec: 125,
    started_at: '2026-08-19T10:00:00.000Z'
  });
  log(
    'Telegram message formatter',
    formatted.includes('Alice') && formatted.includes('Bob') && formatted.includes('2m 5s'),
    formatted.replace(/\n/g, ' | ')
  );
  log(
    'Telegram bot inactive without env vars',
    !isConfigured() && formatDuration(90) === '1m 30s'
  );

  wsA.close();
  wsB.close();
  ws2.close();
  fakePush.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('Test crashed:', err.message);
  process.exit(1);
});