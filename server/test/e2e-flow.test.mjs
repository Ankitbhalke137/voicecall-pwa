import WebSocket from 'ws';

const WS_URL = 'ws://localhost:8080/ws';

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
  const alice = await connect('alice-e2e');
  const bob = await connect('bob-e2e');

  // Alice initiates, server routes to Bob
  const incoming = waitFor(bob, 'INCOMING_CALL');
  alice.send(JSON.stringify({ type: 'INITIATE_CALL', targetUserId: 'bob-e2e', callId: 'call-e2e-1' }));
  await incoming;

  // Alice's SDP offer arrives at Bob BEFORE he answers -> buffered (pending)
  const offerAtBob = waitFor(bob, 'SDP_OFFER');
  alice.send(JSON.stringify({
    type: 'SDP_OFFER', targetUserId: 'bob-e2e',
    sdp: { type: 'offer', sdp: 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA\r\na=setup:actpass\r\na=rtpmap:111 opus/48000/2\r\n' }
  }));
  await offerAtBob;

  // Alice's ICE candidate arrives BEFORE Bob answers -> should be buffered
  const iceAtBob = waitFor(bob, 'ICE_CANDIDATE');
  alice.send(JSON.stringify({
    type: 'ICE_CANDIDATE', targetUserId: 'bob-e2e',
    candidate: { candidate: 'candidate:1 1 udp 2130706431 192.168.1.1 5000 typ host', sdpMid: '0', sdpMLineIndex: 0 }
  }));
  await iceAtBob;

  // Bob accepts -> sends CALL_ACCEPTED + SDP_ANSWER (mirrors acceptCall)
  const acceptedAtAlice = waitFor(alice, 'CALL_ACCEPTED');
  const answerAtAlice = waitFor(alice, 'SDP_ANSWER');
  bob.send(JSON.stringify({ type: 'CALL_ACCEPTED', callId: 'call-e2e-1', targetUserId: 'alice-e2e' }));
  bob.send(JSON.stringify({
    type: 'SDP_ANSWER', targetUserId: 'alice-e2e',
    sdp: { type: 'answer', sdp: 'v=0\r\no=- 2 2 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:BB\r\na=setup:active\r\na=rtpmap:111 opus/48000/2\r\n' }
  }));
  await acceptedAtAlice;
  await answerAtAlice;

  // Bob's ICE candidate flows back to Alice
  const bobIceAtAlice = waitFor(alice, 'ICE_CANDIDATE');
  bob.send(JSON.stringify({
    type: 'ICE_CANDIDATE', targetUserId: 'alice-e2e',
    candidate: { candidate: 'candidate:1 1 udp 2130706431 192.168.1.2 5001 typ host', sdpMid: '0', sdpMLineIndex: 0 }
  }));
  await bobIceAtAlice;

  // Hangup flows
  const hangupAtBob = waitFor(bob, 'HANGUP');
  alice.send(JSON.stringify({ type: 'HANGUP', targetUserId: 'bob-e2e' }));
  await hangupAtBob;

  alice.close();
  bob.close();
  console.log('E2E call flow test: ALL PASSED');
  process.exit(0);
}

main().catch((err) => {
  console.error('E2E test failed:', err.message);
  process.exit(1);
});