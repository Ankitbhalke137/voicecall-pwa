# Phase 1: Core Foundation & Prototyping
## Weeks 1 - 2

---

## Objective
Build the foundational WebRTC P2P voice calling capability between two browser tabs. Set up the project structure, signaling server, and local media capture.

---

## Tasks

### 1.1 Project Setup (Day 1-2)
- [x] Create React + Vite + TypeScript project
- [x] Configure ESLint and Prettier
- [x] Set up folder structure:
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
- [x] Initialize git repository

### 1.2 Web App Manifest (Day 2)
- [x] Create `public/manifest.json`
- [x] Add app icons (192x192, 512x512)
- [x] Configure `display: standalone`
- [x] Test installability in Chrome DevTools

### 1.3 Service Worker Registration (Day 2-3)
- [x] Create `public/sw.js` with basic caching
- [x] Register service worker in `main.tsx`
- [x] Verify registration in Chrome DevTools → Application tab

### 1.4 Local Audio Capture (Day 3-4)
- [x] Implement microphone permission request
- [x] Use `getUserMedia()` API for audio stream
- [x] Add error handling for denied permissions
- [x] Create audio visualizer (optional, Web Audio API)

### 1.5 Signaling Server (Day 4-6)
- [x] Set up Node.js + Express server
- [x] Install `ws` (WebSocket library)
- [x] Implement basic WebSocket connection handling
- [x] Create message relay for SDP offers/answers
- [x] Create message relay for ICE candidates
- [x] Test with two browser tabs manually

### 1.6 WebRTC Peer Connection (Day 6-8)
- [x] Create `CallSessionManager` class
- [x] Implement `RTCPeerConnection` setup
- [x] Configure free STUN servers:
  - `stun:stun.l.google.com:19302`
  - `stun:openrelay.metered.ca:80`
- [x] Implement SDP offer/answer exchange
- [x] Implement ICE candidate exchange
- [x] Add `ontrack` handler for remote audio

### 1.7 Basic Call UI (Day 8-10)
- [x] Create call screen with:
  - "Call" button
  - "Hangup" button
  - Audio element for remote stream
- [x] Add call status indicator (idle/connecting/connected)
- [x] Test end-to-end audio between two Chrome tabs

---

## Deliverables
- [x] Two Chrome tabs can make audio calls
- [x] WebRTC P2P connection established
- [x] Audio streams in both directions
- [x] Basic hangup functionality works

---

## Testing Checklist
- [x] Open two Chrome tabs with the app
- [x] Tab A clicks "Call" → Tab B receives offer
- [x] Tab B answers → Audio connected
- [x] Speak into microphone → Audio heard on other end
- [x] Click "Hangup" → Connection closed

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
