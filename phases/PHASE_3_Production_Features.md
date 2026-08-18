# Phase 3: Production Features
## Weeks 5 - 6

---

## Objective
Add call history, quality monitoring, production TURN servers, error tracking, and deploy to production infrastructure.

---

## Tasks

### 3.1 Call History System (Day 1-2)
- [ ] Create call_logs table:
  ```sql
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
  ```
- [ ] Log call start/end events
- [ ] Calculate call duration
- [ ] Track call status (missed/completed/declined/failed)
- [ ] Create call history API:
  ```
  GET /api/v1/calls/history
  ```
- [ ] Build call history UI (list with timestamps, duration, status)
- [ ] Add "Missed Calls" filter

### 3.2 Call Quality Monitoring (Day 2-3)
- [ ] Implement `getStats()` polling (every 10 seconds)
- [ ] Track metrics:
  - Jitter
  - Packet loss ratio
  - Round-trip time
  - Bitrate
- [ ] Send quality metrics to server
- [ ] Store in database or metrics system
- [ ] Calculate quality score (0.0 - 1.0)
- [ ] Display quality indicator in call UI

### 3.3 TURN Server Setup (Day 3-4)
- [ ] Configure Open Relay free TURN servers:
  ```
  turn:openrelay.metered.ca:80
  turn:openrelay.metered.ca:443
  turn:openrelay.metered.ca:443?transport=tcp
  username: openrelayproject
  credential: openrelayproject
  ```
- [ ] Update WebRTC config with TURN servers
- [ ] Add TURN fallback logic:
  - Try P2P first
  - If fails after 5s → retry with TURN
  - If fails 3x → show error
- [ ] Monitor TURN relay usage
- [ ] (Optional) Deploy self-hosted Coturn on Oracle Cloud free tier

### 3.4 Connection Failure Recovery (Day 4-5)
- [ ] Implement `onconnectionstatechange` handler
- [ ] Detect connection failures
- [ ] Implement automatic ICE restart
- [ ] Add exponential backoff retry:
  ```
  Attempt 1: 1s delay
  Attempt 2: 2s delay
  Attempt 3: 4s delay
  Attempt 4: 8s delay (give up)
  ```
- [ ] Show "Reconnecting..." UI during recovery
- [ ] Handle permanent failure gracefully

### 3.5 SSL/TLS Certificates (Day 5)
- [ ] Install Certbot: `sudo apt install certbot`
- [ ] Generate certificate: `sudo certbot certonly --standalone`
- [ ] Configure Node.js server with HTTPS:
  ```javascript
  const https = require('https');
  const fs = require('fs');
  const server = https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/fullchain.pem')
  }, app);
  ```
- [ ] Force HTTPS redirect
- [ ] Set up auto-renewal cron job

### 3.6 Production Deployment (Day 5-7)
- [ ] **Frontend (Vercel):**
  - [ ] Install Vercel CLI: `npm i -g vercel`
  - [ ] Run `vercel` to deploy
  - [ ] Configure custom domain
- [ ] **Backend (Railway):**
  - [ ] Install Railway CLI: `npm i -g @railway/cli`
  - [ ] Run `railway init` and `railway up`
  - [ ] Set environment variables
- [ ] **Database (Supabase):**
  - [ ] Create production project
  - [ ] Run SQL migrations
  - [ ] Configure connection pooling
- [ ] **DNS Configuration:**
  - [ ] Point domain to Vercel (frontend)
  - [ ] Point API subdomain to Railway (backend)

### 3.7 Error Tracking (Day 7)
- [ ] Create Sentry account (free: 5K errors/month)
- [ ] Install: `npm install @sentry/react`
- [ ] Initialize in `main.tsx`:
  ```javascript
  Sentry.init({
    dsn: 'your-dsn',
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 0.1
  });
  ```
- [ ] Add server-side Sentry:
  ```javascript
  const Sentry = require('@sentry/node');
  Sentry.init({ dsn: 'your-dsn' });
  ```
- [ ] Test error reporting

### 3.8 Uptime Monitoring (Day 7-8)
- [ ] Create UptimeRobot account (free: 50 monitors)
- [ ] Add monitors for:
  - Frontend URL (HTTP check)
  - Backend API (HTTP check)
  - WebSocket endpoint (TCP check)
- [ ] Configure alert notifications (email/Pushover)

### 3.9 Mobile Responsive UI (Day 8-10)
- [ ] Test on Android Chrome
- [ ] Optimize touch targets (44x44px minimum)
- [ ] Test installability on mobile
- [ ] Test push notifications on mobile
- [ ] Optimize for portrait mode
- [ ] Add viewport meta tag:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  ```

---

## Deliverables
- [ ] Call history visible in app
- [ ] Quality metrics tracked and displayed
- [ ] TURN servers configured for NAT traversal
- [ ] Connection failures auto-recover
- [ ] HTTPS enabled
- [ ] Deployed to production (Vercel + Railway)
- [ ] Error tracking active
- [ ] Uptime monitoring active
- [ ] Mobile responsive

---

## Testing Checklist
- [ ] Make 10 calls, verify history recorded
- [ ] Check call quality metrics in dashboard
- [ ] Test behind restrictive network (use mobile hotspot)
- [ ] Kill connection mid-call → verify auto-recovery
- [ ] Access app via HTTPS
- [ ] Check Sentry for any errors
- [ ] Check UptimeRobot for uptime status
- [ ] Test on Android Chrome device

---

## Tech Stack (Phase 3)
| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend Hosting | Vercel | $0 |
| Backend Hosting | Railway | $0 |
| TURN Servers | Open Relay | $0 |
| SSL/TLS | Let's Encrypt | $0 |
| Error Tracking | Sentry | $0 |
| Uptime Monitoring | UptimeRobot | $0 |
| Mobile Testing | Android Chrome | $0 |

---

## Time Estimate: 10 working days
