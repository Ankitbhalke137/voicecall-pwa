# Phase 4: Polish & iOS Support
## Weeks 7 - 8

---

## Objective
Polish the UI/UX, optimize performance, add iOS support via Capacitor, and prepare for beta launch.

---

## Tasks

### 4.1 UI Polish (Day 1-2)
- [ ] Design call screen with:
  - Caller name/avatar
  - Call duration timer
  - Mute/unmute button
  - Speaker toggle
  - End call button
- [ ] Design contact list with:
  - Online status indicators
  - Last seen timestamps
  - Search bar
- [ ] Add loading states and spinners
- [ ] Add error toasts and notifications
- [ ] Implement dark mode (optional)
- [ ] Add animations for call states

### 4.2 Audio Controls (Day 2-3)
- [ ] Implement mute/unmute:
  ```javascript
  localStream.getAudioTracks()[0].enabled = !muted;
  ```
- [ ] Implement speaker/earpiece toggle (mobile)
- [ ] Add volume control
- [ ] Optimize audio constraints for low bandwidth

### 4.3 Ringtone System (Day 3)
- [ ] Add ringtone audio files:
  - `ringtone-outgoing.mp3`
  - `ringtone-incoming.mp3`
  - `ringtone-end.mp3`
- [ ] Play outgoing ringtone while calling
- [ ] Play incoming ringtone on incoming call
- [ ] Stop ringtone on answer/hangup
- [ ] Handle autoplay restrictions (user gesture required)

### 4.4 Vibration Patterns (Day 3)
- [ ] Implement vibration API:
  ```javascript
  navigator.vibrate([500, 250, 500, 250, 500]);
  ```
- [ ] Vibrate on incoming call
- [ ] Vibrate on call end
- [ ] Test on Android devices

### 4.5 Performance Optimization (Day 4-5)
- [ ] Bundle analysis: `npm run build -- --analyze`
- [ ] Code splitting (lazy load pages)
- [ ] Image optimization (WebP format)
- [ ] Service worker caching strategy
- [ ] Minimize bundle size (< 200KB)
- [ ] Add `<link rel="preconnect">` for API domains
- [ ] Test Lighthouse score (target: 90+)

### 4.6 Network Failure Testing (Day 5-6)
- [ ] Test scenarios:
  - WiFi → Mobile data switch
  - Airplane mode on/off
  - Weak signal (3G simulation)
  - Network throttle in DevTools
- [ ] Verify auto-recovery works
- [ ] Verify push notifications still arrive
- [ ] Document behavior for each scenario

### 4.7 Audio Quality Benchmarks (Day 6-7)
- [ ] Test on different networks:
  - WiFi (baseline)
  - 4G LTE
  - 3G (throttled)
- [ ] Measure metrics:
  - Latency (target: < 150ms)
  - Jitter (target: < 30ms)
  - Packet loss (target: < 1%)
- [ ] Optimize Opus codec settings for each scenario
- [ ] Document quality results

### 4.8 iOS Capacitor Setup (Day 7-8)
- [ ] Install Capacitor:
  ```bash
  npm install @capacitor/core @capacitor/cli
  ```
- [ ] Initialize:
  ```bash
  npx cap init VoiceCall com.yourapp.voicecall
  ```
- [ ] Add iOS platform:
  ```bash
  npx cap add ios
  ```
- [ ] Build and sync:
  ```bash
  npm run build
  npx cap sync ios
  ```
- [ ] Open in Xcode:
  ```bash
  npx cap open ios
  ```

### 4.9 iOS Push Notifications (Day 8-9)
- [ ] Configure APNs in Apple Developer account
- [ ] Add iOS push certificate to Firebase
- [ ] Test push notifications on iOS
- [ ] Handle iOS-specific notification behavior

### 4.10 iOS Background Audio (Day 9)
- [ ] Configure background modes in Xcode:
  - Audio, AirPlay, and Picture in Picture
- [ ] Test background audio during calls
- [ ] Handle iOS-specific audio session management

### 4.11 Beta Launch Preparation (Day 9-10)
- [ ] Create beta testing guide
- [ ] Set up feedback collection (Google Form or Tally)
- [ ] Prepare beta tester list
- [ ] Write release notes
- [ ] Create README with setup instructions
- [ ] Add LICENSE file (MIT recommended)

### 4.12 Documentation (Day 10)
- [ ] Update README.md with:
  - Project overview
  - Setup instructions
  - Environment variables
  - Deployment guide
- [ ] Add CONTRIBUTING.md (if open source)
- [ ] Add API documentation
- [ ] Document known issues and limitations

---

## Deliverables
- [ ] Polished UI with animations
- [ ] Working mute/unmute and speaker toggle
- [ ] Ringtone system
- [ ] Performance optimized (Lighthouse 90+)
- [ ] Network failure tested
- [ ] iOS Capacitor wrapper working
- [ ] Beta testing ready
- [ ] Documentation complete

---

## Testing Checklist
- [ ] UI looks good on desktop and mobile
- [ ] Mute/unmute works during call
- [ ] Ringtone plays correctly
- [ ] App scores 90+ on Lighthouse
- [ ] App survives network switches
- [ ] iOS build compiles in Xcode
- [ ] Push notifications work on iOS
- [ ] All documentation accurate

---

## Tech Stack (Phase 4)
| Component | Technology | Cost |
|-----------|-----------|------|
| iOS Wrapper | Capacitor | $0 |
| iOS Distribution | Apple Developer | $99/yr (optional) |
| Performance | Lighthouse | $0 |
| Feedback | Tally / Google Form | $0 |

---

## Time Estimate: 10 working days

---

## Note on iOS Cost
- Capacitor: **FREE**
- Apple Developer account: **$99/year** (only needed for App Store / TestFlight)
- For local testing on physical device: `npx cap run ios` (free)
