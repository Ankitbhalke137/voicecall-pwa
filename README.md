# VoiceCall — Browser-Based Voice Calling PWA

A production-grade, zero-install voice calling application built as a Progressive Web App (PWA) using WebRTC. No app stores, no downloads — install directly from the browser.

## Status: Phase 1 — Core Foundation ✅ COMPLETE (verified working on LAN)

- [x] React + Vite + TypeScript PWA (manifest + service worker)
- [x] Microphone capture via `getUserMedia()`
- [x] Node.js + WebSocket signaling server
- [x] P2P WebRTC audio between two browser tabs
- [x] P2P WebRTC audio between two devices on same WiFi (HTTPS)
- [x] Free STUN/TURN servers (Google + Open Relay Project)
- [x] Call state machine (IDLE / RINGING / CONNECTED / RECONNECTING)
- [x] Call lifecycle: ring → answer/decline → talk → hangup
- [x] Web Audio API ringtone (no audio files needed)
- [x] Remote audio playback (auto-attach + autoplay)
- [x] Signaling socket auto-reconnect with exponential backoff
- [x] ICE restart on connection failure
- [x] Automated signaling tests (7/7 passing) + E2E flow test
- [x] HTTPS on LAN via mkcert (mic requires secure context)
- [x] Free TURN relay fallback for strict NATs

## Phase 1 progress notes

All Phase 1 features are implemented, tested, and verified on real devices over WiFi
(call both directions, audio both ways, ringtone, hangup).

Bugs found and fixed during verification:
- Callee auto-answered before user clicked Answer (offer now buffered)
- Duplicate user IDs across tabs (per-tab sessionStorage)
- Client never sent `?userId=` in WebSocket URL
- Remote audio stream never attached to `<audio>` element
- Mobile WS drops causing missed incoming calls (auto-reconnect added)

## Quick Start

### Prerequisites
- Node.js 18+
- Chrome / Chromium browser

### 1. Start the signaling server

```bash
cd server
npm install
npm run dev        # ws://localhost:8080/ws
```

### 2. Start the client

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

### 3. Make a call
1. Open `http://localhost:5173` in **two browser tabs**
2. Note each tab's **User ID** (shown on the dialer screen)
3. In Tab A, enter Tab B's User ID and press **Call**
4. Tab B receives incoming call → click **Answer**
5. Talk! Audio flows P2P (encrypted via DTLS-SRTP)

> Microphone permission is required. Both tabs must have the app open (WebRTC requires active tabs in Phase 1).

## Project Structure

```
client/                     # React + Vite PWA
├── public/
│   ├── manifest.json       # Installable PWA manifest
│   ├── sw.js               # Service worker (push + caching)
│   └── icons/
├── src/
│   ├── components/CallUI.tsx
│   ├── services/webrtc.ts  # RTCPeerConnection + signaling
│   ├── hooks/useCallSession.ts
│   ├── store/callStore.ts  # Zustand call state machine
│   └── types/
server/                     # Node.js signaling server
├── src/index.js            # Express + WebSocket relay
└── test/signaling.test.mjs # Automated signaling tests
```

## Call Lifecycle States

```
IDLE → RINGING_OUTBOUND → CONNECTED → TERMINATED
IDLE → RINGING_INBOUND → CONNECTED → TERMINATED
CONNECTED → RECONNECTING → CONNECTED (ICE restart on failure)
```

## Testing

```bash
# Signaling server tests (7 checks: connect, call, relay, hangup, errors)
cd server
node test/signaling.test.mjs
```

## Phase Roadmap

| Phase | Status |
|-------|--------|
| 1. Core Foundation | ✅ Complete — P2P calling works on desktop + mobile (LAN) |
| 2. User System & Notifications | ⬜ Next |
| 3. Production Features | ⬜ |
| 4. Polish & iOS | ⬜ |
| 5. Advanced Features | ⬜ |

See [`phases/`](phases/) for detailed task breakdowns.

## Cost: $0

All infrastructure is free tier / open source. See [Browser_Voice_Call_App_Plan.md](Browser_Voice_Call_App_Plan.md) for the full cost breakdown.