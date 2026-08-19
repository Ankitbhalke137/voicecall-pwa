# VoiceCall — Browser-Based Voice Calling PWA

A production-grade, zero-install voice calling application built as a Progressive Web App (PWA) using WebRTC. No app stores, no downloads — install directly from the browser.

## Status: Phase 2 — User System & Notifications ✅ COMPLETE (self-hosted, verified end-to-end)

- [x] **Phase 1** — Core Foundation: P2P calling on desktop + mobile (LAN)
- [x] **Phase 2** — Users, contacts, presence, push notifications, call state machine
- [x] **UI Redesign** — Material 3 dark theme, full-screen call screens, dialer, recents tab (verified)
- [x] **Telegram Call Tracker** — Bot logs all calls with duration, status; `/stats`, `/calls`, `/today` commands

## Phase 2 highlights

- **Accounts**: register/login with username + password (bcrypt + JWT, self-hosted)
- **Contacts**: search by username, add contacts, call directly from the list
- **Presence**: green dot shows when a contact is online (live WebSocket updates)
- **Push notifications**: incoming calls ring via Web Push even when the app is closed (Answer/Decline actions on the notification)
- **Call flow**: offline callee's call is buffered (60s) so answering from a notification still connects
- **State machine**: IDLE → RINGING → CONNECTED → RECONNECTING → TERMINATED (Zustand)
- **$0 + self-hosted**: no Firebase/Supabase — JWT auth, SQLite (`node:sqlite`), and self-generated VAPID keys instead

## Quick Start

### Prerequisites
- Node.js 26+ (for built-in `node:sqlite`)
- Chrome / Chromium browser

### 1. Start the signaling server

```bash
cd server
npm install
npm run dev        # http://localhost:8080 (REST + WebSocket)
```

### 2. Start the client

```bash
cd client
npm install
npm run dev        # https://localhost:5173
```

### 3. Make a call
1. Open the app in **two browsers or profiles** (or two devices on same LAN)
2. Register an account in each (username + password)
3. In Browser A, search for B's username → **Add**
4. Click **Call** next to B's contact → B sees *Incoming Call* → **Answer**
5. Talk! Audio flows P2P (encrypted via DTLS-SRTP)

> Microphone permission is required. Enable **Notifications** in the header to receive
> incoming call alerts when the app is closed or on another tab.

### Optional: Telegram Call Tracker

```bash
# Create a bot with @BotFather, then run:
TELEGRAM_BOT_TOKEN=<token> TELEGRAM_ADMIN_CHAT_ID=<your-chat-id> npm start
```

The bot will post after every call: who called whom, duration, answered/missed/declined.
Commands: `/stats` (all-time), `/today`, `/calls [n]`, `/help`.

## Project Structure

```
client/                     # React + Vite PWA
├── public/
│   ├── manifest.json       # Installable PWA manifest
│   ├── sw.js               # Service worker (push + caching; API never cached)
│   └── icons/
├── src/
│   ├── components/         # AuthPage, ContactsPanel, CallUI, Dialer, RecentsPanel
│   ├── services/           # webrtc.ts, api.ts, push.ts
│   ├── hooks/useCallSession.ts
│   ├── store/              # callStore.ts, authStore.ts, contactsStore.ts, recentsStore.ts
│   └── types/
server/                     # Node.js signaling + API server
├── src/
│   ├── index.js            # Express + WebSocket, presence, call routing, call_logs
│   ├── auth.js             # Register/login + JWT middleware
│   ├── users.js            # Profile, search, contacts APIs
│   ├── push.js             # VAPID keys, push subscribe/send
│   ├── presence.js         # Connection map + presence broadcasts
│   ├── telegram.js         # Telegram bot (long-polling, zero deps)
│   └── db.js               # SQLite schema (node:sqlite)
├── data/voicecall.db       # SQLite database (gitignored)
└── test/                   # signaling.test, phase2.test, e2e-flow.test
```

## API (v1)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account → `{ token, user }` |
| POST | `/api/v1/auth/login` | Log in → `{ token, user }` |
| GET | `/api/v1/users/me` | Current profile |
| GET | `/api/v1/users/search?q=` | Search users by username/display name |
| POST | `/api/v1/contacts` | Add contact `{ contactId }` |
| GET | `/api/v1/contacts` | List contacts |
| GET | `/api/v1/push/vapid-public-key` | VAPID public key for push subscribe |
| POST | `/api/v1/push/subscribe` | Store Web Push subscription |
| DELETE | `/api/v1/push/subscribe` | Remove subscription (logout) |
| GET | `/api/v1/calls` | Call history for authenticated user |

## Call Lifecycle States

```
IDLE → RINGING_OUTBOUND → CONNECTED → TERMINATED
IDLE → RINGING_INBOUND → CONNECTED → TERMINATED
CONNECTED → RECONNECTING → CONNECTED (ICE restart on failure)
```

## Testing

```bash
# Server API tests (Phase 2: 20 checks — auth, contacts, presence, push, call logs, telegram)
cd server && node test/phase2.test.mjs

# Signaling regression (7 checks) + E2E flow
cd server && node test/signaling.test.mjs && node test/e2e-flow.test.mjs
```

Browser E2E (real Chrome via Playwright): register two accounts, add contact,
presence dot, live call both ways, audio attached, hangup — all verified (8/8).

## Phase Roadmap

| Phase | Status |
|-------|--------|
| 1. Core Foundation | ✅ Complete — P2P calling on desktop + mobile (LAN) |
| 2. User System & Notifications | ✅ Complete — self-hosted auth/contacts/presence/push |
| 2.5 UI Redesign | ✅ Complete — Material 3 dark, full-screen calls, dialer, recents |
| 2.5 Telegram Tracker | ✅ Complete — bot logs calls, answers commands |
| 3. Production Features | ⬜ Next |
| 4. Polish & iOS | ⬜ |
| 5. Advanced Features | ⬜ |

See [`phases/`](phases/) for detailed task breakdowns.

## Cost: $0

All infrastructure is free tier / open source / self-hosted. See [Browser_Voice_Call_App_Plan.md](Browser_Voice_Call_App_Plan.md) for the full cost breakdown.

## Pending / Known Gaps

- [ ] Real-device push verification (headless Chrome disables Push API; server path tested with mock)
- [ ] Production deployment (frontend → GitHub Pages, signaling server → Render/Railway/Fly)
- [ ] iOS PWA install flow / Safari compatibility
- [ ] Phase 3: group calls, call recording, message history