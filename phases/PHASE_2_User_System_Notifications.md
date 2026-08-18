# Phase 2: User System & Notifications
## Weeks 3 - 4

---

## Objective
Add user authentication, contact discovery, push notifications, and call lifecycle state management. Users can find each other and receive incoming call alerts.

---

## Tasks

### 2.1 Firebase Setup (Day 1)
- [ ] Create Firebase project at console.firebase.google.com
- [ ] Enable Authentication (Email/Password + Google)
- [ ] Enable Cloud Messaging
- [ ] Create Web App and download config
- [ ] Generate service account key for server

### 2.2 User Authentication (Day 2-3)
- [ ] Install Firebase SDK: `npm install firebase`
- [ ] Create auth context/provider
- [ ] Implement registration flow:
  - Email + password
  - Google sign-in
- [ ] Implement login flow
- [ ] Store JWT token for API/WebSocket auth
- [ ] Add protected route wrapper
- [ ] Create user profile page

### 2.3 User Profile System (Day 3-4)
- [ ] Create Supabase project (free tier)
- [ ] Set up PostgreSQL database
- [ ] Create `users` table:
  ```sql
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Create profile setup page (username, display name, avatar)
- [ ] Save profile to database on registration

### 2.4 Contact Discovery (Day 4-6)
- [ ] Create contacts table:
  ```sql
  CREATE TABLE contacts (
    user_id UUID REFERENCES users(id),
    contact_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, contact_id)
  );
  ```
- [ ] Implement username search API:
  ```
  GET /api/v1/users/search?q=john
  ```
- [ ] Create search UI component
- [ ] Implement "Add Contact" functionality
- [ ] Generate invite links (`/invite/abc123`)
- [ ] Implement QR code generation for profiles
- [ ] Create contact list view

### 2.5 Presence System (Day 6-7)
- [ ] Track online/offline status via WebSocket
- [ ] Broadcast presence updates to contacts
- [ ] Show online indicator (green dot) on contacts
- [ ] Store last seen timestamp

### 2.6 Firebase Cloud Messaging Integration (Day 7-8)
- [ ] Install: `npm install firebase-admin` (server)
- [ ] Generate VAPID keys
- [ ] Register FCM token on client login
- [ ] Store FCM tokens in database:
  ```sql
  CREATE TABLE push_subscriptions (
    user_id UUID REFERENCES users(id) PRIMARY KEY,
    fcm_token TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Implement server-side push sending:
  ```javascript
  admin.messaging().send({
    token: pushToken,
    notification: { title: 'Incoming Call', body: '...' },
    data: { type: 'INCOMING_CALL', callId: '...' }
  });
  ```

### 2.7 Service Worker Push Handling (Day 8-9)
- [ ] Update `sw.js` with FCM push handler
- [ ] Implement `notificationclick` handler
- [ ] Add Answer/Decline action buttons
- [ ] Handle notification click → open app with call ID

### 2.8 Call Lifecycle State Machine (Day 9-10)
- [ ] Install Zustand: `npm install zustand`
- [ ] Create call store with states:
  ```
  IDLE → RINGING_OUTBOUND → CONNECTED → TERMINATED
  IDLE → RINGING_INBOUND → CONNECTED → TERMINATED
  CONNECTED → RECONNECTING → CONNECTED
  ```
- [ ] Implement state transitions
- [ ] Add ringtone playback on incoming/outgoing calls
- [ ] Create ringing UI component
- [ ] Add vibration pattern for incoming calls

### 2.9 Incoming Call Flow (Day 10)
- [ ] Server checks if target user is online (WebSocket)
- [ ] If online: send real-time socket signal
- [ ] If offline: send FCM push notification
- [ ] Client receives incoming call event
- [ ] Display incoming call UI with Answer/Decline
- [ ] Handle answer → start WebRTC negotiation

---

## Deliverables
- [ ] Users can register and log in
- [ ] Users can search and add contacts
- [ ] Incoming calls trigger push notifications
- [ ] Call state machine manages call lifecycle
- [ ] Ringtone plays on incoming calls

---

## Testing Checklist
- [ ] Register two test accounts
- [ ] User A searches for User B by username
- [ ] User A adds User B as contact
- [ ] User A calls User B
- [ ] User B receives push notification (even if app is closed)
- [ ] User B clicks Answer → call connects
- [ ] Call state transitions correctly through all states

---

## Tech Stack (Phase 2)
| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | React + Vite + TypeScript | $0 |
| Backend | Node.js + Express + ws | $0 |
| Auth | Firebase Auth (50K MAU free) | $0 |
| Push | Firebase Cloud Messaging | $0 |
| Database | Supabase PostgreSQL (500MB free) | $0 |
| State | Zustand | $0 |

---

## Time Estimate: 10 working days
