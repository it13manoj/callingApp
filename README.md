# NexCall — Professional 1-to-1 WebRTC Video & Voice Calling Application

A modern, full-stack, enterprise-grade React application featuring **WebRTC 1-to-1 HD Video & Voice Calling**, real-time signaling via Socket.IO, dual authentication (**register with both Email & Mobile Number, log in using any one**), screen sharing, dynamic audio visualizers, and in-call messaging.

---

## 🌟 Key Features

### 1. Dual-Identifier Authentication & Registration
- **Register via Email ID AND Mobile Number**:
  - Full Name, Email ID, Mobile Phone (with international country code selector), Password, and custom/preset avatar.
  - Guaranteed uniqueness check on both Email and Mobile Number (duplicates rejected).
- **Log in using ANY ONE (Email ID OR Mobile Number)**:
  - Single unified input automatically detects whether you're logging in via Email or Mobile number.
  - Password encryption using bcrypt.
  - Quick 1-Click Demo Accounts for instant side-by-side browser testing.

### 2. 1-to-1 Video Calling
- **HD WebRTC Video**: Peer-to-peer media over SRTP/DTLS, with STUN discovery and optional server-issued TURN relay credentials.
- **Picture-in-Picture (PiP)**: Draggable, floating local video feed with flip camera and mute indicator.
- **Remote Camera State Sync**: Remote camera pause indicator when the peer turns off video.
- **Screen Sharing**: Seamlessly share your desktop screen, browser tabs, or app windows with track replacement.

### 3. 1-to-1 Voice Calling
- **Acoustic Audio Pipeline**: Echo cancellation, auto-gain control, and noise suppression.
- **Dynamic Audio Visualizer**: Live HTML5 canvas reacting to speech frequencies via the Web Audio API (`AnalyserNode`).
- **Speaking Activity Rings**: Visual pulsing audio halo when the speaker is talking.

### 4. Real-time Calling UX & Signaling
- **Synthesized Ringtones**: US/International dual-frequency outgoing ring cadence and melodic incoming ringtone generated via the Web Audio API — **zero external audio dependencies, zero 404s**.
- **Incoming Call Dialog**: Pulsating call alert with Caller avatar, name, number, and one-tap Accept/Decline.
- **Outgoing Call Modal**: Radar rings, recipient status, and instant Cancel button.
- **In-Call Chat**: Real-time text messaging drawer during active calls.
- **Call Duration Timer & History**: Tracks completed and missed calls with accurate duration logging.
- **Hardware & Device Check**: Test camera preview and live mic volume levels before placing calls.

---

## 📱 Android APK Generation & Installation

A native Android APK has been built and is ready for installation:

- **Location**: [`NexCall-debug.apk`](file:///d:/Manoj/Learning/callapp/NexCall-debug.apk) *(Size: ~4.2 MB)*
- **Package Name**: `com.nexcall.app`
- **Target SDK**: Android 36 (minSdkVersion: 24, Android 7.0+)
- **Included Permissions**: Camera, Audio Recording, Internet, Wi-Fi / Network State, Bluetooth.

### Install on Device via ADB
```bash
adb install NexCall-debug.apk
```
*(Or transfer `NexCall-debug.apk` directly to your phone via USB or Google Drive / WhatsApp, and tap to install).*

### Android calling without push notifications

The Android client uses its live Socket.IO connection for calling and does not require Firebase Cloud Messaging. Both users must be signed in with the app open and connected to the server. Calls cannot alert users when the app is closed or offline.

### TURN relay configuration

STUN alone cannot connect peers on every mobile carrier or restricted network. For reliable cross-network calls, configure a TURN service that supports Coturn REST shared-secret authentication on the server:

```env
TURN_URLS=turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp
TURN_SHARED_SECRET=your-server-only-shared-secret
```

The authenticated `/api/rtc-config` endpoint issues one-hour credentials; the shared secret is never included in the client or APK. Without TURN credentials, the app falls back to STUN and may be unable to establish a call on restrictive networks.

### Rebuild APK anytime
```bash
npm run build:apk
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 1. Start Full Application (Production Mode)
```bash
# Starts the fullstack server serving both API, WebRTC signaling & built React frontend on port 5000
npm start
```
Then open: **`http://localhost:5000`** in your browser.

### 2. Start Full Application (Development Mode)
```bash
# Starts Express backend on port 5000 and Vite React dev server on port 5173
npm run dev
```
Then open: **`http://localhost:5173`** in your browser.

---

## 👥 Instant 2-User Testing (How to test 1-to-1 calling)

1. Open **`http://localhost:5000`** in your primary browser window.
2. Click **"via Email"** on the Sarah Connor demo card (or log in with `sarah@nexcall.com` / `password123`).
3. Click the **"Test in 2nd Tab"** button at the top right (or open a new Incognito / Private window).
4. In the second window, click **"via Phone"** on the Alex Miller demo card (or log in with `+16505558392` / `password123`).
5. Notice that both users show **Online (Green Dot)** in the left sidebar directory!
6. Click the **Video Call** or **Voice Call** icon next to the other user's name:
   - The caller hears outgoing ringing.
   - The recipient sees the incoming call modal and hears the chime.
   - Click **Accept** to initiate the WebRTC peer connection!

---

## 📁 Project Architecture

```
callapp/
├── package.json              # Root scripts (start, dev, build)
├── server/
│   ├── package.json          # Express, Socket.IO, Bcrypt, JWT
│   ├── data/
│   │   └── db.json           # Persistent user directory and call logs
│   └── src/
│       ├── server.js         # HTTP + Socket.IO server & static frontend serving
│       ├── auth.js           # Registration & Login endpoints (Email OR Mobile)
│       ├── socketHandler.js  # WebRTC signaling (offers, answers, ICE, media sync)
│       └── storage.js        # Data layer & phone normalization
└── client/
    ├── index.html            # HTML entry point with dark mode styling
    ├── package.json          # React 18, Tailwind CSS, Lucide icons, Socket.IO client
    ├── vite.config.js        # Vite config with API and WebSocket proxies
    ├── tailwind.config.js    # Tailwind glassmorphism design tokens
    └── src/
        ├── components/
        │   ├── auth/
        │   │   ├── Login.jsx            # Login using Email OR Mobile Number
        │   │   └── Register.jsx         # Registration requiring Email AND Mobile
        │   ├── call/
        │   │   ├── ActiveCallModal.jsx  # Full 1-to-1 Video & Voice calling view
        │   │   ├── IncomingCallModal.jsx# Pulsing incoming call modal with audio
        │   │   ├── OutgoingCallModal.jsx# Calling radar modal with cancel
        │   │   ├── AudioVisualizer.jsx  # Web Audio API canvas visualizer
        │   │   └── InCallChat.jsx       # Real-time text chat drawer
        │   ├── dashboard/
        │   │   ├── Header.jsx           # Profile bar, status & hardware check
        │   │   ├── Sidebar.jsx          # Contacts directory & call logs
        │   │   ├── MainContent.jsx      # Direct dial & camera preview
        │   │   └── DeviceSettingsModal.jsx # Live mic volume meter & camera test
        │   └── common/
        │       └── Avatar.jsx           # Avatar with online/in-call status dot
        ├── context/
        │   ├── AuthContext.jsx          # User session & credentials state
        │   ├── SocketContext.jsx        # WebSocket connection & presence tracking
        │   └── CallContext.jsx          # WebRTC lifecycle, tracks & media controls
        ├── services/
        │   ├── api.js                   # REST API client
        │   └── sound.js                 # Web Audio API ringtone synthesizer
        ├── App.jsx                      # Root container & view routing
        ├── main.jsx                     # Application bootstrap
        └── index.css                    # Tailwind & glassmorphism styles
```

---

## 🔐 Authentication Details

- **Registration**:
  - `POST /api/auth/register`
  - Body: `{ name, email, phone, displayPhone, password, avatar, title }`
  - Validates that email and phone number are both supplied and unique.
- **Login**:
  - `POST /api/auth/login`
  - Body: `{ identifier, password }`
  - `identifier` accepts either the Email Address (e.g. `sarah@nexcall.com`) **OR** the Mobile Number (e.g. `+1 415 555 2671` or `+14155552671`).
  - Returns JWT bearer token and user profile.
