import WebSocket from 'ws';

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
  const alice = await connect('alice');
  const bob = await connect('bob');
  log('Both clients connect', true);

  const incomingPromise = waitFor(bob, 'INCOMING_CALL');
  alice.send(JSON.stringify({
    type: 'INITIATE_CALL',
    targetUserId: 'bob',
    callId: 'call-test-1'
  }));
  const incoming = await incomingPromise;
  log('INCOMING_CALL delivered to bob', true, `callId=${incoming.callId}`);

  const acceptedPromise = waitFor(alice, 'CALL_ACCEPTED');
  bob.send(JSON.stringify({
    type: 'CALL_ACCEPTED',
    callId: 'call-test-1',
    targetUserId: 'alice'
  }));
  await acceptedPromise;
  log('CALL_ACCEPTED relayed to alice', true);

  const offerPromise = waitFor(bob, 'SDP_OFFER');
  alice.send(JSON.stringify({
    type: 'SDP_OFFER',
    targetUserId: 'bob',
    sdp: { type: 'offer', sdp: 'v=0 mock-offer' }
  }));
  const offer = await offerPromise;
  log('SDP_OFFER relayed', true, `senderId=${offer.senderId}`);

  const candidatePromise = waitFor(bob, 'ICE_CANDIDATE');
  alice.send(JSON.stringify({
    type: 'ICE_CANDIDATE',
    targetUserId: 'bob',
    candidate: { candidate: 'mock-candidate', sdpMid: '0', sdpMLineIndex: 0 }
  }));
  await candidatePromise;
  log('ICE_CANDIDATE relayed', true);

  const hangupPromise = waitFor(bob, 'HANGUP');
  alice.send(JSON.stringify({ type: 'HANGUP', targetUserId: 'bob' }));
  await hangupPromise;
  log('HANGUP relayed', true);

  const errorPromise = waitFor(alice, 'ERROR');
  alice.send(JSON.stringify({ type: 'INITIATE_CALL', targetUserId: 'nobody', callId: 'x' }));
  const err = await errorPromise;
  log('Offline target produces ERROR', true, err.message);

  alice.close();
  bob.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('Test crashed:', err.message);
  process.exit(1);
});