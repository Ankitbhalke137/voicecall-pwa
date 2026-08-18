# Comprehensive System Architecture & Engineering Plan
## Browser-Based Real-Time Voice Calling Application (PWA + WebRTC + Push API)
### Fully Free & Open Source Stack — No Paid Services Required

---

## 1. Executive Summary & Product Vision

### 1.1 Objective
To architect, build, and deploy a production-grade, zero-install, cross-platform voice calling application that runs natively inside Google Chrome and modern Chromium browsers via **Progressive Web App (PWA)** technologies. The app eliminates the need for native Android (`.apk`) or iOS (`.ipa`) binaries while providing real-time audio communication, incoming call notifications, call state management, user discovery, call history, and optional group calling.

**Cost: $0. Every component is free tier or open source.**

### 1.2 Target Experience & Mechanics
- **Platform Availability:** Desktop (Windows, macOS, Linux, Chrome OS) and Mobile (Android Chrome, Kiwi Browser, Brave). iOS supported via Capacitor wrapper (see Section 9).
- **Call Topology:** Peer-to-Peer (P2P) WebRTC for 1:1 calling; optional SFU (Selective Forwarding Unit) via mediasoup for group calls.
- **Notification System:** Web Push API via Firebase Cloud Messaging (FCM) — completely free at any scale — integrated with a Service Worker to wake background contexts, displaying actionable system notifications with **[Answer]** and **[Decline]** interactive buttons.
- **Installation Model:** Web App Manifest enabling desktop/home-screen installation (`standalone` display mode), providing a borderless, native-like window application.

---

## 2. Technical Architecture & System Topography

```
                       +-----------------------------------+
                       |        Frontend Client            |
                       |  (React PWA / WebRTC Engine)      |
                       +-----------------+-----------------+
                                         |
            +----------------------------+----------------------------+
            |                            |                            |
            v                            v                            v
   +-----------------+          +-----------------+          +-----------------+
   | Signaling       |          | Push Service    |          | STUN / TURN     |
   | (Node / Socket) |          | (FCM - FREE)   |          | (Free Servers)  |
   +--------+--------+          +--------+--------+          +--------+--------+
            |                            |                            |
            +----------------------------+----------------------------+
                                         |
                                         v
                       +-----------------------------------+
                       |      WebRTC Audio Pipeline        |
                       |  (Opus Codec / P2P Mesh Network)  |
                       +-----------------------------------+
                                         |
                                         v
                       +-----------------------------------+
                       |      Optional: SFU Gateway        |
                       |  (mediasoup - Group Calls)        |
                       +-----------------------------------+
```

### 2.1 Core Subsystems

#### Client Layer (PWA Frontend)
- **Framework:** React.js / Vite (Single Page Application architecture) with TypeScript.
- **Media Processing:** Browser `getUserMedia()` media streams, Web Audio API for custom ringtones, gain control, and dynamic audio visualizer nodes.
- **State Management:** Zustand for call lifecycle states (`IDLE`, `RINGING_OUTBOUND`, `RINGING_INBOUND`, `CONNECTED`, `RECONNECTING`, `TERMINATED`).
- **Service Worker Context:** `sw.js` script handling background message payloads, caching static assets, and displaying OS-level push notifications.

#### Signaling Subsystem
- **Protocol:** WebSockets (`ws://` / `wss://`) via Socket.io or native `ws`.
- **Role:** Negotiates session parameters (SDP Offers, SDP Answers) and exchanges ICE candidates between peers. No audio data passes through the signaling server.
- **State Storage:** PostgreSQL (Supabase free tier) for user data, presence, and call logs. In-memory Map or SQLite for local dev.

#### Network Traversal Subsystem (NAT Traversal)
- **STUN (Session Traversal Utilities for NAT):** Free public STUN servers (Google, Mozilla, Open Relay Project) — zero cost.
- **TURN (Traversal Using Relays around NAT):** Free TURN servers from Open Relay Project (metered.com free tier: 50GB/month) OR self-hosted Coturn on Oracle Cloud Always Free tier (4 ARM instances, 24GB RAM total).

#### Push Notification Infrastructure
- **Provider:** Firebase Cloud Messaging (FCM) — **100% free, no usage limits**. Supports both web push and Android push.
- **Protocol:** VAPID (Voluntary Application Server Identification) key protocol over WebPush API.

#### User Management & Discovery
- **Authentication:** Firebase Auth free tier (50K monthly active users) or Supabase Auth free tier.
- **Contact System:** Users can search by username, share invite links, or scan QR codes.
- **Call History:** Stored in PostgreSQL (Supabase free tier) — unlimited rows on free plan.

---

## 3. WebRTC Call Flow & Lifecycle Architecture

### 3.1 Session Establishment Sequence

```
[Caller A]            [Signaling Server]         [FCM Push]           [Callee B SW]          [Callee B UI]
    |                         |                        |                      |                      |
    |--- 1. Initiate Call --->|                        |                      |                      |
    |    (Target: User B)     |                        |                      |                      |
    |                         |--- 2. Query Presence ->|                      |                      |
    |                         |                        |                      |                      |
    |                         |-- 3a. Socket Active? ---------------------------------------------->| (Direct Ring)
    |                         |                        |                      |                      |
    |                         |-- 3b. Socket Offline ->|-- 4. Send FCM ----->|                      |
    |                         |                        |   Push (FREE)        |-- 5. Show System --->|
    |                         |                        |                      |      Notification    |
    |                         |                        |                      |<-- 6. Click Answer --|
    |                         |<----------------------- 7. Socket Connect ----|                      |
    |                         |<----------------------- 8. Send "ACCEPTED" ---|                      |
    |<-- 9. Exchange SDP -----|<----------------------- Exchange SDP Candidates --------------------|
    |    & ICE Candidates     |                        |                      |                      |
    |                         |                        |                      |                      |
    |======================= 10. Direct P2P Encrypted Audio Stream ==================================|
```

### 3.2 Key Lifecycle States

```
                    +--------------------+
                    |        IDLE        |
                    +---------+----------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
    +-------------------+           +-------------------+
    | RINGING_OUTBOUND  |           |  RINGING_INBOUND  |
    +---------+---------+           +---------+---------+
              |                               |
              +---------------+---------------+
                              |
                              v
                    +--------------------+
                    |     CONNECTED      |
                    +---------+----------+
                              |
                     (Network Disruption)
                              v
                    +--------------------+
                    |    RECONNECTING    |
                    +---------+----------+
                              |
                              v
                    +--------------------+
                    |     TERMINATED     |
                    +--------------------+
```

---

## 4. Frontend & Service Worker Implementation Plan

### 4.1 Web App Manifest Specification (`manifest.json`)

```json
{
  "short_name": "VoiceCall",
  "name": "VoiceCall PWA WebRTC Communications",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "/icons/icon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": "/?source=pwa",
  "background_color": "#0F172A",
  "theme_color": "#2563EB",
  "display": "standalone",
  "orientation": "portrait",
  "categories": ["communications", "productivity"]
}
```

### 4.2 Service Worker Code Base (`public/sw.js`)

```javascript
self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  if (data.type === 'INCOMING_CALL') {
    const title = `Incoming Call from ${data.callerName}`;
    const options = {
      body: 'Tap to answer or dismiss.',
      icon: '/icons/call-icon.png',
      badge: '/icons/badge.png',
      tag: `call-${data.callId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500, 250, 500, 250, 500],
      data: {
        callId: data.callId,
        callerId: data.callerId,
        roomUrl: `/?callId=${data.callId}&autoAnswer=true`
      },
      actions: [
        { action: 'answer', title: 'Answer', icon: '/icons/accept.png' },
        { action: 'decline', title: 'Decline', icon: '/icons/decline.png' }
      ]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const action = event.action;
  const notificationData = event.notification.data;
  if (action === 'decline') {
    fetch('/api/v1/calls/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: notificationData.callId })
    });
    return;
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'ACCEPT_CALL_FROM_SW', callId: notificationData.callId });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(notificationData.roomUrl);
      }
    })
  );
});
```

### 4.3 WebRTC PeerConnection Client (`src/services/webrtc.ts`)

```typescript
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export class CallSessionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private socket: WebSocket;
  private config: WebRTCConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:openrelay.metered.ca:80' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  };

  constructor(socketUrl: string) {
    this.socket = new WebSocket(socketUrl);
    this.registerSocketEvents();
  }

  public async initializeMedia(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 },
        video: false
      });
      return this.localStream;
    } catch (err) {
      console.error('Microphone Permission Denied or Device Error:', err);
      throw err;
    }
  }

  public async initiateCall(targetUserId: string): Promise<void> {
    await this.initializeMedia();
    this.createPeerConnection(targetUserId);
    if (!this.peerConnection || !this.localStream) return;
    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.socket.send(JSON.stringify({ type: 'SDP_OFFER', targetUserId, sdp: offer }));
  }

  private createPeerConnection(remoteUserId: string): void {
    this.peerConnection = new RTCPeerConnection(this.config);
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.send(JSON.stringify({ type: 'ICE_CANDIDATE', targetUserId: remoteUserId, candidate: event.candidate }));
      }
    };
    this.peerConnection.ontrack = (event) => {
      const remoteAudioElement = document.getElementById('remote-audio') as HTMLAudioElement;
      if (remoteAudioElement && event.streams[0]) {
        remoteAudioElement.srcObject = event.streams[0];
        remoteAudioElement.play().catch(console.error);
      }
    };
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'failed') {
        this.handleConnectionFailure();
      }
    };
  }

  private handleConnectionFailure(): void {
    if (this.peerConnection) {
      this.peerConnection.restartIce();
    }
  }

  public async handleIncomingOffer(callerUserId: string, offerSdp: RTCSessionDescriptionInit): Promise<void> {
    await this.initializeMedia();
    this.createPeerConnection(callerUserId);
    if (!this.peerConnection || !this.localStream) return;
    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.socket.send(JSON.stringify({ type: 'SDP_ANSWER', targetUserId: callerUserId, sdp: answer }));
  }

  private registerSocketEvents(): void {
    this.socket.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'SDP_OFFER':
          await this.handleIncomingOffer(msg.callerUserId, msg.sdp);
          break;
        case 'SDP_ANSWER':
          if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          }
          break;
        case 'ICE_CANDIDATE':
          if (this.peerConnection) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
          break;
        case 'ICE_RESTART':
          if (this.peerConnection) {
            this.peerConnection.restartIce();
          }
          break;
      }
    };
  }

  public hangup(): void {
    this.peerConnection?.close();
    this.localStream?.getTracks().forEach(track => track.stop());
    this.socket.send(JSON.stringify({ type: 'HANGUP' }));
  }
}
```

---

## 5. Backend Architecture & Signaling Server

### 5.1 Technology Selection (All Free)
- **Runtime:** Node.js Ecosystem with Express framework + `ws` (native WebSocket library).
- **Push Notifications:** Firebase Admin SDK with FCM — completely free at any scale.
- **Authentication:** Firebase Auth — 50K monthly active users free.
- **Database:** PostgreSQL via Supabase free tier (500MB storage, 50K rows) or self-hosted SQLite for local dev.
- **Realtime Presence:** In-memory Map for single-server; Supabase Realtime (free tier) for multi-instance.

### 5.2 Server Implementation (`server/signaling.js`)

```javascript
const WebSocket = require('ws');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

const serviceAccount = require('./service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const app = express();
app.use(cors());
app.use(express.json());

const server = app.listen(8080);
const wss = new WebSocket.Server({ server });

const activeConnections = new Map();
const userPushTokens = new Map();

async function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/v1/calls/history', authenticateToken, async (req, res) => {
  res.json({ calls: [] });
});

app.get('/api/v1/users/search', authenticateToken, async (req, res) => {
  const { query } = req.query;
  res.json({ users: [] });
});

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  let userId;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    userId = decoded.uid;
    activeConnections.set(userId, ws);
    broadcastPresence(userId, 'online');
  } catch (err) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'INITIATE_CALL':
        handleCallInitiation(userId, data.targetUserId, data.callId);
        break;
      case 'SDP_OFFER':
      case 'SDP_ANSWER':
      case 'ICE_CANDIDATE':
      case 'HANGUP':
        relaySignalingMessage(userId, data);
        break;
      case 'REGISTER_PUSH':
        userPushTokens.set(userId, data.token);
        break;
      case 'UPDATE_PRESENCE':
        broadcastPresence(userId, data.status);
        break;
    }
  });

  ws.on('close', () => {
    activeConnections.delete(userId);
    broadcastPresence(userId, 'offline');
  });
});

function handleCallInitiation(callerId, targetUserId, callId) {
  const targetSocket = activeConnections.get(targetUserId);
  if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
    targetSocket.send(JSON.stringify({ type: 'INCOMING_CALL', callerId, callId }));
  } else {
    const pushToken = userPushTokens.get(targetUserId);
    if (pushToken) {
      const message = {
        token: pushToken,
        notification: { title: 'Incoming Call', body: `User ${callerId} is calling you` },
        data: { type: 'INCOMING_CALL', callerId, callId },
        webpush: {
          fcmOptions: { link: `/?callId=${callId}&autoAnswer=true` },
          notification: {
            title: 'Incoming Call', body: 'Tap to answer',
            icon: '/icons/call-icon.png', badge: '/icons/badge.png',
            requireInteraction: true, vibrate: [500, 250, 500, 250, 500],
            actions: [
              { action: 'answer', title: 'Answer' },
              { action: 'decline', title: 'Decline' }
            ]
          }
        }
      };
      admin.messaging().send(message).catch(err => console.error('FCM Push Error:', err));
    }
  }
}

function relaySignalingMessage(senderId, data) {
  const targetSocket = activeConnections.get(data.targetUserId);
  if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
    targetSocket.send(JSON.stringify({ ...data, senderId }));
  }
}

function broadcastPresence(userId, status) {
  const presenceData = JSON.stringify({ type: 'PRESENCE_UPDATE', userId, status });
  activeConnections.forEach((socket, uid) => {
    if (uid !== userId && socket.readyState === WebSocket.OPEN) {
      socket.send(presenceData);
    }
  });
}
```

---

## 6. User Discovery & Contact System

### 6.1 User Registration & Login Flow

```
+-------------------+          +-------------------+          +-------------------+
|  User Opens App   |          |  Firebase Auth    |          |  PostgreSQL DB    |
+--------+----------+          +--------+----------+          +--------+----------+
         |                              |                              |
         |--- 1. Sign Up/Login ------->|                              |
         |    (Email/Google/GitHub)     |                              |
         |                              |--- 2. Create/Auth User ---->|
         |                              |    (Free up to 50K MAU)     |
         |<-- 3. Return JWT Token ------|                              |
         |--- 4. Store Profile ------>|--- 5. Save to DB ---------->|
```

### 6.2 Contact Discovery Methods

1. **Username Search:** Users set unique username, others can search by it.
2. **Invite Links:** Generate shareable links like `yourapp.com/invite/abc123`.
3. **QR Codes:** Each user gets a QR code on their profile page.
4. **Import Contacts (Optional):** Request phone contacts permission, match against registered users.

### 6.3 Contact List Store (`src/store/contacts.ts`)

```typescript
interface Contact {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: Date;
}

export const useContactStore = create((set) => ({
  contacts: [] as Contact[],
  addContact: async (userId: string) => {
    const response = await fetch('/api/v1/contacts/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ targetUserId: userId })
    });
  },
  searchUsers: async (query: string) => {
    const response = await fetch(`/api/v1/users/search?q=${query}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
  },
  removeContact: async (contactId: string) => {}
}));
```

---

## 7. Call History & Metadata

### 7.1 Database Schema (PostgreSQL via Supabase)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID REFERENCES users(id),
  callee_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  status TEXT CHECK (status IN ('missed', 'completed', 'declined', 'failed')),
  connection_type TEXT CHECK (connection_type IN ('p2p', 'turn_relay', 'sfu')),
  quality_score FLOAT
);

CREATE TABLE contacts (
  user_id UUID REFERENCES users(id),
  contact_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, contact_id)
);

CREATE TABLE push_subscriptions (
  user_id UUID REFERENCES users(id) PRIMARY KEY,
  fcm_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Call Quality Monitoring

```typescript
private monitorQuality(): void {
  if (!this.peerConnection) return;
  const statsInterval = setInterval(async () => {
    const stats = await this.peerConnection!.getStats();
    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        const quality = {
          jitter: report.jitter,
          packetLoss: report.packetsLost / report.packetsReceived,
          roundTripTime: report.roundTripTime
        };
        this.socket.send(JSON.stringify({ type: 'QUALITY_METRICS', metrics: quality }));
      }
    });
  }, 10000);
}
```

---

## 8. Edge Cases, Operational Challenges & Solutions

### 8.1 Autoplay Restrictions (Chrome Media Policy)
- **Problem:** Browsers block unmuted programmatic audio playback if the user has not interacted with the document.
- **Solution:** Require explicit user gesture (e.g., clicking the **[Answer]** action button) to trigger `.play()` on the incoming audio track.

### 8.2 Mobile Background Restrictions & Battery Optimizations
- **Problem:** Android OS throttles background WebSocket connections and puts Chrome to sleep after periods of inactivity.
- **Solution:** Rely exclusively on **FCM Push Notifications** when the tab is backgrounded. FCM is handled natively by the OS push service, waking the Service Worker without requiring an active WebSocket loop. FCM is completely free at any scale.

### 8.3 Symmetric NATs & Deep Packet Inspection (DPI)
- **Problem:** Direct P2P WebRTC connection establishment fails in ~15-20% of network environments.
- **Solution:** Use free TURN servers from Open Relay Project (50GB/month free). For higher usage, deploy Coturn on Oracle Cloud Always Free tier (4 ARM instances, 24GB RAM total — zero cost forever). Configure TURN-over-TLS on port 443 to bypass firewalls.

### 8.4 Audio Quality under Low Bandwidth
- **Problem:** Audio degradation, jitter, and dropped frames on 3G / congested networks.
- **Solution:** Enforce Opus Codec configuration parameters during SDP generation:
  ```javascript
  sdp = sdp.replace('useinbandfec=1', 'useinbandfec=1;maxaveragebitrate=20000');
  ```
  Additionally, implement adaptive bitrate switching based on network quality metrics.

### 8.5 iOS Safari Limitations
- **Problem:** iOS Safari has limited Service Worker support, kills background WebRTC connections, and `requireInteraction` on notifications doesn't work.
- **Solution:** Use **Capacitor** (free, open source by Ionic) to wrap the PWA in a lightweight native shell for iOS. This gives full Service Worker control, background audio, and reliable push notifications. Requires Apple Developer account ($99/year) — only needed if iOS support is critical. Alternative: Accept degraded iOS experience with manual app-open on incoming calls.

### 8.6 Push Notification Delivery Failures
- **Problem:** Web Push has ~70-85% delivery rate. Some users will miss incoming calls.
- **Solution:** Multi-layer fallback strategy:
  1. Primary: FCM Web Push (free)
  2. Fallback: If WebSocket is connected, send real-time signal (no push needed)
  3. Fallback: If call is missed, send SMS notification via Twilio (only $0.0079/SMS — use only for critical missed calls)
  4. Visual: In-app ringing when tab is open (always works)

### 8.7 Connection Failure Recovery
- **Problem:** P2P connections can fail mid-call.
- **Solution:** Automatic ICE restart on connection failure, with exponential backoff retry (1s, 2s, 4s, 8s). If P2P fails 3 times, fallback to TURN relay automatically.

### 8.8 NAT Traversal in Restrictive Networks
- **Problem:** In some corporate networks, even TURN-over-TLS may fail.
- **Solution:** Graceful degradation — detect connection failure after 10s timeout, display "Network restricted, call quality may be reduced" message to user, and continue with relayed audio.

---

## 9. iOS Support via Capacitor (Free Wrapper)

### 9.1 Why Capacitor
Capacitor is free, open source, and wraps your existing web app in a native shell without rewriting code. It gives you:
- Full Service Worker control
- Background audio support
- Reliable push notifications via FCM native SDK
- Access to native APIs if needed

### 9.2 Setup Instructions

```bash
npm install @capacitor/core @capacitor/cli
npx cap init VoiceCall com.yourapp.voicecall
npx cap add ios
npm run build
npx cap sync ios
npx cap open ios
```

### 9.3 Cost Note
- Capacitor itself: **FREE**
- Apple Developer account: **$99/year** (only required for App Store distribution or TestFlight)
- Alternative: Use `npx cap run ios` for local testing on physical device without App Store

### 9.4 Recommendation
Start with PWA only (Android + Desktop). Add Capacitor for iOS only if you have users who need it. The $99/year Apple fee is the only cost in this entire plan.

---

## 10. Monitoring & Observability (All Free)

### 10.1 Self-Hosted Monitoring Stack

| Component | Tool | Cost |
|-----------|------|------|
| Error Tracking | Sentry (free tier: 5K errors/month) | $0 |
| Server Metrics | Prometheus + Grafana (self-hosted) | $0 |
| Uptime Monitoring | UptimeRobot (free: 50 monitors) | $0 |
| Log Management | Papertrail (free: 100MB/month) | $0 |
| Analytics | Plausible (self-hosted) or Umami | $0 |

### 10.2 Key Metrics to Track

```typescript
const metrics = {
  activeConnections: activeConnections.size,
  callsInitiated: 0,
  callsCompleted: 0,
  callsFailed: 0,
  averageCallDuration: 0,
  turnRelayUsage: 0,
  pushNotificationsSent: 0,
  pushNotificationsDelivered: 0
};
```

### 10.3 Call Quality Dashboard

```
+--------------------------------------------------+
|  Call Quality Dashboard (Grafana)                |
+--------------------------------------------------+
|  Active Calls: 12        |  Avg Duration: 4:32   |
|  P2P Success Rate: 82%   |  TURN Usage: 18%      |
|  Avg Jitter: 12ms        |  Packet Loss: 0.3%    |
|  Failed Calls: 2 today   |  Push Delivery: 94%   |
+--------------------------------------------------+
```

---

## 11. Group Calling (Optional — SFU Architecture)

### 11.1 When You Need SFU
- P2P mesh works for 1:1 calls and up to ~4 participants
- Beyond 4 participants, use a Selective Forwarding Unit (SFU)

### 11.2 Free SFU Options

| SFU | License | Notes |
|-----|---------|-------|
| **mediasoup** | ISC (free) | Most flexible, requires custom integration |
| **Jitsi Videobridge** | Apache 2.0 (free) | Easier setup, less control |
| **LiveKit** | Apache 2.0 (free) | Modern, good documentation |

### 11.3 mediasoup Integration (Free)

```bash
npm install mediasoup mediasoup-client
```

```javascript
const mediasoup = require('mediasoup');

async function createRoom(roomId) {
  const worker = await mediasoup.createWorker({ rtcMinPort: 10000, rtcMaxPort: 59999 });
  const room = await worker.createRouter({
    mediaCodecs: [{ kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 }]
  });
  return { worker, room };
}
```

---

## 12. E2E Encryption (Built-In + Optional Enhancement)

### 12.1 WebRTC Built-In Encryption
WebRTC encrypts all media using **DTLS-SRTP** by default. No additional work needed.

### 12.2 Optional: Key Verification
For paranoid users, implement key fingerprint verification:

```typescript
const fingerprint = await peerConnection.getRemoteDescription();
const sha256 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint.sdp));
const fingerprintHex = Array.from(new Uint8Array(sha256))
  .map(b => b.toString(16).padStart(2, '0')).join(':');
displayFingerprint(fingerprintHex);
```

---

## 13. Step-by-Step Implementation & Launch Roadmap

```
+-----------------------------------------------------------------------------------+
| PHASE 1: Core Foundation & Prototyping (Weeks 1 - 2) — ✅ COMPLETE               |
|-----------------------------------------------------------------------------------|
| [x] Create React + Vite + TypeScript project                                      |
| [x] Build Web App Manifest & Service Worker registration                          |
| [x] Implement local audio capture using getUserMedia() API                        |
| [x] Set up local Node.js + WebSocket signaling server                             |
| [ ] Implement Firebase Auth (free: 50K MAU) — moved to Phase 2                    |
| [x] Achieve P2P WebRTC audio stream between two desktop Chrome tabs               |
| [x] Test with free STUN servers (Google, Open Relay)                              |
| [x] Verified P2P audio between two devices on same WiFi (HTTPS via mkcert)        |
| [x] Web Audio API ringtone + remote audio playback                               |
| [x] Signaling socket auto-reconnect with exponential backoff                      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 2: User System & Notifications (Weeks 3 - 4) — ⬜ NEXT                     |
|-----------------------------------------------------------------------------------|
| [ ] Integrate Firebase Cloud Messaging (FCM) — completely free                    |
| [ ] Program Service Worker push handlers and interactive notification actions     |
| [ ] Implement Zustand state machine for call lifecycle management                 |
| [ ] Build user registration, login, and profile system                            |
| [ ] Implement contact discovery (username search, invite links, QR codes)         |
| [ ] Add ringtone playback and Web Audio API visualizers                           |
| [ ] Store user profiles in PostgreSQL (Supabase free tier)                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 3: Production Features (Weeks 5 - 6)                                       |
|-----------------------------------------------------------------------------------|
| [ ] Implement call history and logging (Supabase PostgreSQL free)                 |
| [ ] Add call quality monitoring (jitter, packet loss, MOS score)                  |
| [ ] Deploy free TURN servers: Open Relay (50GB/mo) or Oracle Cloud free tier      |
| [ ] Deploy signaling server to free hosting (Railway/Render/Vercel free tier)     |
| [ ] Enforce SSL/TLS certificates (free via Let's Encrypt)                         |
| [ ] Implement connection failure recovery and ICE restart                         |
| [ ] Add Sentry error tracking (free: 5K errors/month)                             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 4: Polish & iOS (Weeks 7 - 8)                                              |
|-----------------------------------------------------------------------------------|
| [ ] Mobile responsive UI optimization                                             |
| [ ] iOS Capacitor wrapper (optional — $99/yr Apple Dev only if needed)            |
| [ ] Network failure testing (SIM switching, background throttling)                |
| [ ] Audio quality benchmarks across desktop and mobile Chrome                     |
| [ ] UptimeRobot monitoring setup (free: 50 monitors)                              |
| [ ] Deploy Grafana + Prometheus for server metrics (self-hosted, free)            |
| [ ] Beta launch and user feedback collection                                      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 5: Advanced Features (Weeks 9 - 12) — Optional                             |
|-----------------------------------------------------------------------------------|
| [ ] Group calling via mediasoup SFU (free, open source)                           |
| [ ] Call recording (local, with consent)                                          |
| [ ] Push notification fallback: missed call SMS via Twilio (pay-per-use only)     |
| [ ] Contact import from phone (optional, with privacy disclosure)                 |
| [ ] Adaptive bitrate for low-bandwidth networks                                   |
| [ ] E2E key fingerprint verification for security-conscious users                 |
+-----------------------------------------------------------------------------------+
```

---

## 14. Complete Cost Breakdown

| Component | Service | Cost |
|-----------|---------|------|
| Frontend Hosting | Vercel free tier | $0 |
| Backend Hosting | Railway free tier ($5 credit/mo) or Render free tier | $0 |
| Database | Supabase free tier (500MB, 50K MAU) | $0 |
| Authentication | Firebase Auth free tier (50K MAU) | $0 |
| Push Notifications | Firebase Cloud Messaging (unlimited) | $0 |
| TURN Servers | Open Relay Project (50GB/mo free) | $0 |
| TURN Backup | Oracle Cloud Always Free tier (self-hosted Coturn) | $0 |
| STUN Servers | Google public STUN (unlimited) | $0 |
| SSL/TLS Certificates | Let's Encrypt (unlimited) | $0 |
| Error Tracking | Sentry free tier (5K errors/mo) | $0 |
| Uptime Monitoring | UptimeRobot free tier (50 monitors) | $0 |
| Analytics | Umami self-hosted | $0 |
| Group Calling SFU | mediasoup (open source) | $0 |
| **TOTAL** | | **$0** |

**Optional Cost (only if iOS App Store needed):** Apple Developer account = $99/year

---

## 15. Free Hosting Deployment Guide

### 15.1 Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (auto-detects Vite/React)
vercel

# Custom domain: add in Vercel dashboard (free)
```

### 15.2 Backend (Railway)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and create project
railway login
railway init

# Deploy
railway up

# Add environment variables in Railway dashboard
# (FIREBASE_CONFIG, JWT_SECRET, etc.)
```

### 15.3 Alternative: Render

```bash
# Connect GitHub repo to Render
# Auto-deploys on push
# Free tier: 750 hours/month
```

### 15.4 Database (Supabase)

```bash
# 1. Create account at supabase.com
# 2. Create new project
# 3. Run SQL migrations in SQL editor
# 4. Connection string available in settings
```

### 15.5 Firebase Setup

```bash
# 1. Create project at console.firebase.google.com
# 2. Enable Authentication (Email/Google/GitHub)
# 3. Enable Cloud Messaging
# 4. Create Web App, download config
# 5. Generate service account key for server
# 6. All free up to 50K MAU and unlimited push
```

---

## 16. Development Environment Setup

```bash
# Clone and setup
git clone <your-repo>
cd voicecall-pwa

# Frontend
cd client
npm install
npm run dev          # Starts on http://localhost:5173

# Backend
cd ../server
npm install
cp .env.example .env # Add Firebase config, JWT_SECRET
npm run dev          # Starts on http://localhost:8080

# Local TURN testing (optional)
docker run -d --name coturn -p 3478:3478 -p 3478:3478/udp coturn/coturn
```

---

## 17. Key Environment Variables

```env
# Firebase (free)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# JWT
JWT_SECRET=your-super-secret-random-string

# Database (Supabase free)
DATABASE_URL=postgresql://postgres:xxxxx@db.xxxxx.supabase.co:5432/postgres

# App
CLIENT_URL=http://localhost:5173
PORT=8080
```

---

## Summary

This plan delivers a **production-grade voice calling PWA at $0 cost** using:
- **React + Vite + TypeScript** (frontend)
- **Node.js + WebSockets** (signaling)
- **WebRTC** with free STUN/TURN servers (media)
- **Firebase Auth + FCM** (auth + push — free at any scale)
- **Supabase PostgreSQL** (database — free tier)
- **Capacitor** (optional iOS wrapper — free)
- **mediasoup** (optional group calls — free, open source)

The only potential cost is $99/year for Apple Developer if you need iOS App Store distribution. Everything else is genuinely free.
