# Phase 5: Advanced Features
## Weeks 9 - 12

---

## Objective
Add group calling, call recording, advanced push fallbacks, and security enhancements. Optional phase for scaling and advanced use cases.

---

## Tasks

### 5.1 Group Calling with SFU (Day 1-4)
- [ ] Install mediasoup:
  ```bash
  npm install mediasoup mediasoup-client
  ```
- [ ] Create SFU room management:
  ```javascript
  async function createRoom(roomId) {
    const worker = await mediasoup.createWorker({
      rtcMinPort: 10000,
      rtcMaxPort: 59999
    });
    const room = await worker.createRouter({
      mediaCodecs: [{
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
      }]
    });
    return { worker, room };
  }
  ```
- [ ] Implement producer (caller sends audio)
- [ ] Implement consumer (receives audio from all participants)
- [ ] Create room UI (show participants, mute indicators)
- [ ] Handle participant join/leave
- [ ] Test with 3-5 participants
- [ ] Optimize for bandwidth (limit to audio-only)

### 5.2 Call Recording (Day 4-5)
- [ ] Implement client-side recording using MediaRecorder API:
  ```javascript
  const recorder = new MediaRecorder(localStream);
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    // Download or save
  };
  recorder.start();
  ```
- [ ] Add recording button to call UI
- [ ] Add consent notification (both parties must agree)
- [ ] Store recordings locally (IndexedDB)
- [ ] Add download option after call ends
- [ ] Add privacy disclaimer

### 5.3 Push Notification Fallback (Day 5-6)
- [ ] Implement SMS fallback for missed calls:
  ```javascript
  // Only for critical missed calls
  const accountSid = 'your_twilio_sid';
  const authToken = 'your_twilio_token';
  const client = require('twilio')(accountSid, authToken);
  
  client.messages.create({
    body: `Missed call from ${callerName}`,
    to: phoneNumber,
    from: yourTwilioNumber
  });
  ```
- [ ] Add opt-in/out for SMS notifications
- [ ] Track delivery rates
- [ ] Add rate limiting (max 3 SMS/hour/user)
- [ ] Note: Twilio costs $0.0079/SMS (pay only for actual use)

### 5.4 Contact Import (Day 6-7)
- [ ] Request contacts permission
- [ ] Read phone contacts
- [ ] Match contacts against registered users
- [ ] Show matches in app
- [ ] Add privacy disclosure:
  "We'll check if your contacts use VoiceCall"
- [ ] Make this feature optional (user can skip)

### 5.5 Adaptive Bitrate (Day 7-8)
- [ ] Monitor network quality during call
- [ ] Implement bandwidth detection:
  ```javascript
  const stats = await peerConnection.getStats();
  stats.forEach(report => {
    if (report.type === 'outbound-rtp') {
      const bitrate = report.bytesSent * 8 / elapsed;
      // Adjust quality based on bitrate
    }
  });
  ```
- [ ] Dynamically adjust Opus bitrate:
  - High bandwidth: 32kbps
  - Medium bandwidth: 20kbps
  - Low bandwidth: 12kbps
- [ ] Update SDP with new bitrate
- [ ] Test on slow networks

### 5.6 E2E Key Verification (Day 8-9)
- [ ] Extract DTLS-SRTP fingerprint:
  ```javascript
  const sdp = peerConnection.localDescription.sdp;
  const lines = sdp.split('\n');
  const fingerprintLine = lines.find(l => l.startsWith('a=fingerprint'));
  ```
- [ ] Display fingerprint in call UI
- [ ] Add manual verification flow:
  - User A sees fingerprint
  - User B sees same fingerprint
  - Users confirm match
- [ ] Store verified contacts
- [ ] Show verification badge on verified contacts

### 5.7 Analytics Dashboard (Day 9-10)
- [ ] Install Umami (self-hosted, free):
  ```bash
  docker run -d --name umami -p 3000:3000 \
    -e DATABASE_URL="postgresql://..." \
    ghcr.io/umami-software/umami:postgresql-latest
  ```
- [ ] Track metrics:
  - Daily active users
  - Total calls
  - Average call duration
  - Peak concurrent users
  - Geographic distribution
- [ ] Create dashboard view
- [ ] Set up weekly email reports

### 5.8 Scalability Improvements (Day 10-12)
- [ ] Implement Redis for pub/sub presence:
  ```javascript
  const Redis = require('ioredis');
  const pub = new Redis();
  const sub = new Redis();
  
  // Subscribe to presence channels
  sub.subscribe('presence');
  sub.on('message', (channel, message) => {
    // Broadcast to connected clients
  });
  ```
- [ ] Add load balancer (nginx)
- [ ] Configure horizontal scaling
- [ ] Add health check endpoint:
  ```javascript
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });
  ```
- [ ] Set up log aggregation

---

## Deliverables
- [ ] Group calling for 3-5 participants
- [ ] Call recording with consent
- [ ] SMS fallback for missed calls (optional)
- [ ] Contact import from phone
- [ ] Adaptive bitrate for low bandwidth
- [ ] E2E key verification
- [ ] Analytics dashboard
- [ ] Scalability infrastructure

---

## Testing Checklist
- [ ] Group call works with 3+ participants
- [ ] Recording captures audio correctly
- [ ] SMS sends on missed call (if enabled)
- [ ] Contact import matches users
- [ ] Adaptive bitrate adjusts on slow network
- [ ] Key verification shows correct fingerprint
- [ ] Analytics shows correct metrics
- [ ] App scales to 100+ concurrent users

---

## Tech Stack (Phase 5)
| Component | Technology | Cost |
|-----------|-----------|------|
| Group Calls | mediasoup | $0 |
| Recording | MediaRecorder API | $0 |
| SMS Fallback | Twilio | $0.0079/SMS |
| Analytics | Umami (self-hosted) | $0 |
| Presence | Redis | $0 |
| Load Balancer | nginx | $0 |

---

## Time Estimate: 12 working days

---

## Total Project Summary

| Phase | Duration | Cost |
|-------|----------|------|
| Phase 1: Core Foundation | Weeks 1-2 | $0 |
| Phase 2: User System | Weeks 3-4 | $0 |
| Phase 3: Production | Weeks 5-6 | $0 |
| Phase 4: Polish & iOS | Weeks 7-8 | $0 (or $99/yr for iOS) |
| Phase 5: Advanced | Weeks 9-12 | $0 |
| **TOTAL** | **12 weeks** | **$0** |

---

## Final Cost Breakdown

| Item | Cost |
|------|------|
| Frontend (Vercel) | $0 |
| Backend (Railway) | $0 |
| Database (Supabase) | $0 |
| Auth (Firebase) | $0 |
| Push (FCM) | $0 |
| TURN (Open Relay) | $0 |
| SSL (Let's Encrypt) | $0 |
| Error Tracking (Sentry) | $0 |
| Uptime (UptimeRobot) | $0 |
| Analytics (Umami) | $0 |
| Group Calls (mediasoup) | $0 |
| **TOTAL** | **$0** |

**Optional:** Apple Developer account = $99/year (only for iOS App Store)
