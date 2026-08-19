# Phase 2: User System & Notifications
## Weeks 3 - 4

---

## Objective
Add user authentication, contact discovery, push notifications, and call lifecycle state management. Users can find each other and receive incoming call alerts.

---

## Status: ✅ COMPLETE (self-hosted stack — see notes below)

> **Substitution note:** The original plan called for Firebase Auth, Firebase Cloud
> Messaging, and Supabase. To keep everything $0, self-hosted, and private, Phase 2
> was built with equivalent open-source components on the existing Node server:
>
> | Planned (cloud) | Built (self-hosted) |
> |---|---|
> | Firebase Auth | JWT auth (bcrypt + jsonwebtoken) on our Express server |
> | Supabase PostgreSQL | SQLite via built-in `node:sqlite` (zero setup) |
> | FCM push | Web Push API (web-push + self-generated VAPID keys) |
>
> No external accounts, no API keys, no usage limits.

## Tasks

### 2.1 Firebase Setup (Day 1)
- [x] ~~Create Firebase project~~ → **Skipped**: self-hosted JWT auth instead
- [x] ~~Enable Authentication~~ → **Skipped**: implemented in `server/src/auth.js`
- [x] ~~Enable Cloud Messaging~~ → **Skipped**: Web Push API with self-generated VAPID keys
- [x] ~~Create Web App and download config~~ → **Skipped**: client uses `services/api.ts`
- [x] ~~Generate service account key for server~~ → **Skipped**: no server-side FCM needed

### 2.2 User Authentication (Day 2-3)
- [x] Register/login with email-style username + password (`POST /api/v1/auth/register`, `/login`)
- [x] Passwords hashed with bcrypt (10 rounds)
- [x] JWT issued on register/login (30-day expiry), stored client-side
- [x] Protected API routes via `Authorization: Bearer <token>`
- [x] WebSocket auth via `?token=` (JWT verified on connect)
- [x] Auth UI: login / register pages with validation
- [x] Session restore on app load; auto-logout on invalid token
- [x] ~~Firebase SDK~~ → replaced by `client/src/services/api.ts`

### 2.3 User Profile System (Day 3-4)
- [x] ~~Supabase~~ → SQLite via `node:sqlite` (Node 26 built-in, no native builds)
- [x] `users` table: id (UUID), username (unique), display_name, password_hash, created_at, last_seen
- [x] Profile setup: display name chosen at registration
- [x] Profile saved to DB on registration; `GET /api/v1/users/me`

### 2.4 Contact Discovery (Day 4-6)
- [x] `contacts` table (user_id, contact_id, PK both)
- [x] Username search API: `GET /api/v1/users/search?q=john` (exact match ranked first)
- [x] Search UI with add-contact button
- [x] Add contact API (`POST /api/v1/contacts`) + contact list view (`GET /api/v1/contacts`)
- [x] ~~Invite links / QR codes~~ → deferred to Phase 3 (search covers discovery)
- [x] Contact list shows avatar, display name, @username, Call button

### 2.5 Presence System (Day 6-7)
- [x] Online/offline tracked via WebSocket connection map
- [x] `PRESENCE_UPDATE` broadcast to contacts on connect/disconnect (reverse lookup: users who have you as a contact)
- [x] Presence sent immediately when a contact is added if they're online
- [x] Green dot indicator on online contacts
- [x] `last_seen` updated in DB on connect

### 2.6 Push Integration (Day 7-8)
- [x] `web-push` server module with auto-generated VAPID keys (`vapid.json`, gitignored)
- [x] `GET /api/v1/push/vapid-public-key`
- [x] `POST /api/v1/push/subscribe` stores subscription (upsert per user)
- [x] `DELETE /api/v1/push/subscribe` on logout
- [x] Server-side push sending with TTL 60s; expired subscriptions (404/410) auto-cleaned
- [x] Push payload: `{ type: 'INCOMING_CALL', callId, callerId, callerName }`

### 2.7 Service Worker Push Handling (Day 8-9)
- [x] `sw.js` push handler shows "Incoming Call from <name>" notification (requireInteraction, vibrate pattern)
- [x] `notificationclick` with Answer / Decline actions
- [x] Decline → server reject; Answer → focuses app and auto-answers
- [x] Offline SDP buffering on server (60s TTL) so push-answered calls connect end-to-end
- [x] Notification click with no open window → opens app with `?callId=&callerId=` and auto-answers
- [x] SW cache fix: `/api/` responses are never cached (stale contacts bug)

### 2.8 Call Lifecycle State Machine (Day 9-10)
- [x] Zustand call store (installed in Phase 1) with full state machine
- [x] `IDLE → RINGING_OUTBOUND → CONNECTED → TERMINATED`
- [x] `IDLE → RINGING_INBOUND → CONNECTED → TERMINATED`
- [x] `CONNECTED → RECONNECTING → CONNECTED` (ICE restart)
- [x] Ringtone playback (Web Audio API, Phase 1)
- [x] Ringing UI (CallUI component with Answer/Decline/Hang Up)
- [x] Vibration pattern on incoming calls (`navigator.vibrate`)

### 2.9 Incoming Call Flow (Day 10)
- [x] Server checks target online via WebSocket map
- [x] Online → real-time socket signal (`INCOMING_CALL` with caller name)
- [x] Offline → Web Push notification; caller gets `CALL_PUSHED` and "Ringing their device" notice
- [x] Client incoming call UI with Answer/Decline
- [x] Answer → WebRTC negotiation (offer buffered for offline callee)
- [x] Offline + no subscription → clear error to caller

### 2.10 UI Redesign — Material 3 Dark Theme (New)
- [x] Tailwind CSS 3 + Material 3 palette (`#0b1326` bg, `#c0c1ff` primary, `#4ae176` secondary)
- [x] Full-screen call screens: Active Call (timer, waveform, mute/speaker/hold), Incoming Call (pulse avatar, Answer/Decline), Calling
- [x] Keypad dialer with formatted display, backspace, long-press clear
- [x] Recents tab (localStorage-persisted, 50-call limit)
- [x] Bottom nav (Dialer / Contacts / Recents) + header (notifications, logout)
- [x] Remote audio element hoisted for reliable stream attachment
- [x] E2E selectors preserved for all automated tests

### 2.11 Telegram Call Tracker (New)
- [x] `call_logs` table: call_id, caller_id, callee_id, status (answered/declined/missed), started/answered/ended timestamps, duration_sec
- [x] Call tracking in signaling server: `activeCalls` Map, finalize on HANGUP/CALL_REJECTED/CALL_ACCEPTED
- [x] `GET /api/v1/calls` endpoint (auth) — call history for the user
- [x] `server/src/telegram.js` — zero-dep bot (long-polling):
  - Posts after every call: status, names, duration, time
  - Commands: `/stats`, `/today`, `/calls [n]`, `/help`
  - Safe no-op when `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ADMIN_CHAT_ID` not set
- [x] Client sends `callId` in HANGUP for accurate correlation
- [x] FK-safe finalize (try/catch so fake test users don't crash server)

---

## Deliverables
- [x] Users can register and log in
- [x] Users can search and add contacts
- [x] Incoming calls trigger push notifications
- [x] Call state machine manages call lifecycle
- [x] Ringtone plays on incoming calls
- [x] **New:** Material 3 dark UI with dialer, recents, full-screen call screens
- [x] **New:** Telegram bot logs all calls with duration and status

---

## Testing Checklist
- [x] Register two test accounts (automated: `server/test/phase2.test.mjs`, **20/20 checks**)
- [x] User A searches for User B by username
- [x] User A adds User B as contact
- [x] User A calls User B (browser E2E: real call connects both ways)
- [x] User B receives incoming call UI with Answer/Decline
- [x] Presence green dot shows online contacts
- [ ] User B receives push notification with app closed → **needs real device/browser verification** (headless Chrome disables Push API; verified server-side path with mock push service)
- [x] User B clicks Answer → call connects (browser E2E verified via socket path)
- [x] Call state transitions correctly through all states
- [x] Call logs written for answered/declined/missed calls
- [x] Telegram formatter unit test passes; bot inactive without env vars

## Verification summary (this phase)
- Server API tests: **20/20** (`node test/phase2.test.mjs`)
- Phase 1 regression: **7/7** signaling + E2E flow
- Browser E2E: **8/8** (real Chrome: register → search → add contact → presence dot → call → answer → audio attached → hangup)

---

## Tech Stack (Phase 2 — built)
| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | React + Vite + TypeScript + Tailwind CSS | $0 |
| Backend | Node.js + Express + ws | $0 |
| Auth | bcrypt + JWT (self-hosted) | $0 |
| Push | Web Push API + VAPID (self-hosted) | $0 |
| Database | SQLite (`node:sqlite`, Node 26+) | $0 |
| State | Zustand | $0 |

---

## Time Estimate: 10 working days (delivered self-hosted)

## Pending (outside Phase 2 scope)
- [ ] Real-device push verification (requires phone on same LAN + HTTPS cert trust)
- [ ] Production deployment (frontend → GitHub Pages, signaling server → Render/Railway/Fly)
- [ ] iOS PWA install flow / Safari compatibility testing