# Phase 1: Core Foundation & Prototyping
## Weeks 1 - 2

---

## Objective
Build the foundational WebRTC P2P voice calling capability between two browser tabs. Set up the project structure, signaling server, and local media capture.

---

## Tasks

### 1.1 Project Setup (Day 1-2)
- [ ] Create React + Vite + TypeScript project
- [ ] Configure ESLint and Prettier
- [ ] Set up folder structure:
  ```
  client/
  ├── public/
  │   ├── sw.js
  │   ├── manifest.json
  │   └── icons/
  ├── src/
  │   ├── components/
  │   ├── services/
  │   ├── store/
  │   ├── hooks/
  │   ├── pages/
  │   ├── types/
  │   └── utils/
  └── package.json
  
  server/
  ├── src/
  │   ├── routes/
  │   ├── middleware/
  │   └── utils/
  └── package.json
  ```
- [ ] Initialize git repository

### 1.2 Web App Manifest (Day 2)
- [ ] Create `public/manifest.json`
- [ ] Add app icons (192x192, 512x512)
- [ ] Configure `display: standalone`
- [ ] Test installability in Chrome DevTools

### 1.3 Service Worker Registration (Day 2-3)
- [ ] Create `public/sw.js` with basic caching
- [ ] Register service worker in `main.tsx`
- [ ] Verify registration in Chrome DevTools → Application tab

### 1.4 Local Audio Capture (Day 3-4)
- [ ] Implement microphone permission request
- [ ] Use `getUserMedia()` API for audio stream
- [ ] Add error handling for denied permissions
- [ ] Create audio visualizer (optional, Web Audio API)

### 1.5 Signaling Server (Day 4-6)
- [ ] Set up Node.js + Express server
- [ ] Install `ws` (WebSocket library)
- [ ] Implement basic WebSocket connection handling
- [ ] Create message relay for SDP offers/answers
- [ ] Create message relay for ICE candidates
- [ ] Test with two browser tabs manually

### 1.6 WebRTC Peer Connection (Day 6-8)
- [ ] Create `CallSessionManager` class
- [ ] Implement `RTCPeerConnection` setup
- [ ] Configure free STUN servers:
  - `stun:stun.l.google.com:19302`
  - `stun:openrelay.metered.ca:80`
- [ ] Implement SDP offer/answer exchange
- [ ] Implement ICE candidate exchange
- [ ] Add `ontrack` handler for remote audio

### 1.7 Basic Call UI (Day 8-10)
- [ ] Create call screen with:
  - "Call" button
  - "Hangup" button
  - Audio element for remote stream
- [ ] Add call status indicator (idle/connecting/connected)
- [ ] Test end-to-end audio between two Chrome tabs

---

## Deliverables
- [ ] Two Chrome tabs can make audio calls
- [ ] WebRTC P2P connection established
- [ ] Audio streams in both directions
- [ ] Basic hangup functionality works

---

## Testing Checklist
- [ ] Open two Chrome tabs with the app
- [ ] Tab A clicks "Call" → Tab B receives offer
- [ ] Tab B answers → Audio connected
- [ ] Speak into microphone → Audio heard on other end
- [ ] Click "Hangup" → Connection closed

---

## Tech Stack (Phase 1)
| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | React + Vite + TypeScript | $0 |
| Backend | Node.js + Express + ws | $0 |
| STUN | Google public STUN | $0 |
| Database | None (in-memory) | $0 |
| Auth | None | $0 |

---

## Time Estimate: 10 working days
