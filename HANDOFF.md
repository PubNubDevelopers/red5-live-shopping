# Live Shopping Red5 — Full Status Audit & AI Handoff

> **Date**: March 18, 2026
> **Branch**: `main` (all changes are uncommitted local modifications)
> **State**: Code is written but has **never been tested end-to-end** due to persistent build/cache issues during development.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Feature-by-Feature Status](#feature-by-feature-status)
4. [File Map](#file-map)
5. [PubNub Channels](#pubnub-channels)
6. [Environment Setup](#environment-setup)
7. [How to Run](#how-to-run)
8. [Known Issues & Risks](#known-issues--risks)
9. [What Was Attempted (History)](#what-was-attempted-history)
10. [AI Handoff Prompt](#ai-handoff-prompt)

---

## Project Overview

This is a **live shopping demo** built with:
- **Next.js 15** frontend (`web/`)
- **Node.js/Express** backend (`backend/`)
- **PubNub** for real-time messaging (chat, reactions, commentary, product highlights, video sync, betting)
- **Red5 Pro** for optional WebRTC PiP streaming (camera sharing between users)
- **Vimeo** embed for the main soccer video stream

The backend runs a **timeline engine** that publishes scripted events (chat messages, commentary, product cards, bets, reactions) at specific timestamps relative to video playback. The frontend subscribes to PubNub channels and renders overlays on top of the fullscreen video.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              liveStreamPage.tsx (932 lines)               │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │  Vimeo   │  │ LiveCommentary│  │ ProductCardOverlay│   │   │
│  │  │  iframe   │  │  (overlay)   │  │   (overlay)       │   │   │
│  │  └──────────┘  └──────────────┘  └──────────────────┘   │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐              │   │
│  │  │  Chat    │  │ Reactions │  │ BetCard   │              │   │
│  │  │ overlay  │  │ (emojis)  │  │ (overlay) │              │   │
│  │  └──────────┘  └──────────┘  └───────────┘              │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐              │   │
│  │  │CartPanel │  │CoinWallet│  │ BetHistory│              │   │
│  │  │(slide-out)│  │ (header) │  │ (panel)   │              │   │
│  │  └──────────┘  └──────────┘  └───────────┘              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                   PubNub Chat SDK                               │
│                   subscriptions                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │   PubNub    │
                    │   Cloud     │
                    └──────┬──────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                    BACKEND (Express, port 3002)                  │
│                                                                 │
│  Timeline Engine:                                               │
│    - Loads chat.js, commentary.js, reactions.js, bets.json,     │
│      products.json                                              │
│    - Merges all events, sorts by timeSinceVideoStartedInMs      │
│    - Runs a 1-second interval loop                              │
│    - Publishes events whose timestamp <= currentTime            │
│    - Publishes video sync STATUS to game.video-control          │
│    - Loops back to start after all events fire (up to 5x)       │
│                                                                 │
│  REST API:                                                      │
│    POST /start          - Start the timeline simulation         │
│    POST /stop           - Stop the simulation                   │
│    POST /toggle-chat    - Pause/resume chat messages            │
│    POST /on-demand/:name - Run fan-excitement/fan-frustration   │
│    GET  /status         - Current state (running, time, etc.)   │
│    GET  /products       - List all products                     │
│    GET  /bets           - List all bet proposals                │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: How Products Appear

1. Backend starts timeline loop after `POST /start`
2. At `currentTime = 5000ms`, backend publishes to `game.product-highlight`:
   ```json
   { "type": "PRODUCT_HIGHLIGHT", "product": { "id": "TUMBLER01", "name": "Euro 2024 Stanley Tumbler...", "price": "34.99", "images": ["/ads/ad-offer1.png"], ... } }
   ```
3. Frontend `liveStreamPage.tsx` receives this via PubNub subscription on `game.product-highlight`
4. Sets `activeProduct` state, which causes `<ProductCardOverlay>` to render
5. At `currentTime = 45000ms`, backend publishes `{ "type": "PRODUCT_DISMISS" }`
6. Frontend sets `activeProduct` to `null`, card disappears

### Data Flow: How Commentary Appears

1. At `currentTime = 2000ms`, backend publishes to `game.commentary`:
   ```json
   { "text": "A stadium alive with atmosphere...", "timeCode": "0:02" }
   ```
2. `LiveCommentary.tsx` receives this via PubNub subscription on `game.commentary`
3. Adds to its local `messages` state array, renders in a collapsible overlay

### Data Flow: How Video Sync Works

1. Every second, backend publishes to `game.video-control`:
   ```json
   { "type": "STATUS", "playbackTimeMs": 5000, "videoStarted": true }
   ```
2. Frontend subscribes, compares `playbackTimeMs / 1000` to Vimeo's `getCurrentTime()`
3. If drift > 3 seconds, calls `vimeoPlayer.setCurrentTime(targetSec)`
4. Throttled to max one seek per 2 seconds

---

## Feature-by-Feature Status

### 1. Soccer Video (Vimeo embed)

| Item | Detail |
|------|--------|
| Location | `liveStreamPage.tsx` lines 426-434 |
| Video ID | `1073970603` (Vimeo) |
| Embed params | `?background=1&autoplay=1&loop=1&muted=1` |
| Rendering | `<iframe>` with CSS to fill viewport |
| Status | **Code complete, UNTESTED** |

### 2. Video Sync Across Tabs

| Item | Detail |
|------|--------|
| Backend | `backend/index.js` lines 238-249, publishes STATUS every second |
| Frontend | `liveStreamPage.tsx` lines 242-278, seeks via `@vimeo/player` SDK |
| Dependency | `@vimeo/player` installed in `web/node_modules` |
| Channel | `game.video-control` |
| Status | **Code complete, UNTESTED. Risk: `?background=1` may block seeking** |

### 3. Product Highlights

| Item | Detail |
|------|--------|
| Data | `backend/game-data/products.json` — 4 products |
| Timings | 5s-45s, 55s-95s, 105s-145s, 155s-195s (40s each, 10s gaps) |
| Backend | `backend/index.js` `buildProductEvents()` lines 79-104 |
| Frontend sub | `liveStreamPage.tsx` lines 213-224 |
| Frontend render | `liveStreamPage.tsx` lines 707-715, renders `ProductCardOverlay` |
| Images | `web/public/ads/ad-offer1.png`, `ad-offer2.png`, `ad-offer5.png`, `ad-offer6.png` — **all exist on disk** |
| Status | **Code complete, UNTESTED** |

**Products in order:**

| # | ID | Name | Appears | Disappears | Image |
|---|-----|------|---------|------------|-------|
| 1 | TUMBLER01 | Euro 2024 Stanley Tumbler | 5s | 45s | ad-offer1.png |
| 2 | MEAL01 | Victory Meal Box | 55s | 95s | ad-offer2.png |
| 3 | SHOES01 | JXC-290 Sport Trainers | 105s | 145s | ad-offer5.png |
| 4 | SCREEN01 | Match Day 4K Screen | 155s | 195s | ad-offer6.png |

### 4. Live Commentary

| Item | Detail |
|------|--------|
| Data | `backend/game-data/commentary.js` — 127 soccer events |
| Time range | 2,000ms to 1,208,000ms (~20 minutes) |
| Channel | `game.commentary` |
| Frontend | `LiveCommentary.tsx` subscribes, renders with timeCode |
| Rendered at | `liveStreamPage.tsx` lines 702-704 |
| Status | **Code complete, UNTESTED** |

### 5. Cart System

| Item | Detail |
|------|--------|
| Hook | `web/app/hooks/useCart.ts` — persists to PubNub App Context |
| Panel | `web/app/components/CartPanel.tsx` — slide-out from right |
| Trigger | Shopping bag icon in bottom bar (`liveStreamPage.tsx` lines 783-796) |
| Status | **Code complete, UNTESTED** |

### 6. Betting System

| Item | Detail |
|------|--------|
| Data | `backend/game-data/bets.json` |
| Hook | `web/app/hooks/useBets.ts` |
| Component | `web/app/components/BetCard.tsx` |
| Status | **Existed before refactor, unchanged** |

### 7. Chat + Reactions

| Item | Detail |
|------|--------|
| Chat | Inline in `liveStreamPage.tsx`, uses `channel.connect()` |
| Reactions | Floating emojis, PubNub pub/sub on `game.stream-reactions` |
| Status | **Existed before refactor, unchanged, known to work** |

### 8. PiP Camera (Red5 Pro WebRTC)

| Item | Detail |
|------|--------|
| Publisher | `web/app/hooks/useRed5Publisher.ts` |
| Subscriber | `web/app/hooks/useRed5Subscriber.ts` |
| UI | PiP box in top-left of `liveStreamPage.tsx` |
| Status | **Existed before refactor, requires Red5 Pro instance** |

---

## File Map

### Backend

| File | Purpose | Lines |
|------|---------|-------|
| `backend/index.js` | Timeline engine, PubNub publisher, Express API | 366 |
| `backend/game-data/products.json` | 4 soccer products with display timings | 102 |
| `backend/game-data/commentary.js` | 127 soccer commentary events (2s to 1208s) | ~950 |
| `backend/game-data/bets.json` | Betting proposals and results | varies |
| `backend/game-data/chat.js` | Simulated fan chat messages | varies |
| `backend/game-data/reactions.js` | Emoji reaction events | varies |
| `backend/on-demand/fan-excitement.js` | On-demand burst of excited reactions | varies |
| `backend/on-demand/fan-frustration.js` | On-demand burst of frustrated reactions | varies |
| `backend/.env` | PubNub keys (pub/sub/secret), GUIDED_DEMO=true, PORT=3002 | 4 |

### Frontend

| File | Purpose | Lines |
|------|---------|-------|
| `web/app/pages/liveStreamPage.tsx` | Main UI — video, chat, products, commentary, bets, PiP | 932 |
| `web/app/pages/loginPage.tsx` | User login (name entry) | varies |
| `web/app/page.tsx` | Root page, routes to login or live stream | varies |
| `web/app/components/LiveCommentary.tsx` | Commentary overlay (collapsible, auto-scroll) | 133 |
| `web/app/components/ProductCardOverlay.tsx` | Product card (compact + expanded bottom sheet) | 217 |
| `web/app/components/CartPanel.tsx` | Shopping cart slide-out panel | 152 |
| `web/app/components/BetCard.tsx` | Betting card overlay | varies |
| `web/app/components/BetHistory.tsx` | Bet history panel | varies |
| `web/app/components/CoinWallet.tsx` | Coin balance display in header | varies |
| `web/app/components/CoinAnimation.tsx` | Win/loss coin animation | varies |
| `web/app/components/ProductPicker.tsx` | (may be unused, check) | varies |
| `web/app/types/product.ts` | Product interface, color mapping for 4 product IDs | 38 |
| `web/app/hooks/useCart.ts` | Cart state, persisted to PubNub App Context | 124 |
| `web/app/hooks/useBets.ts` | Betting state management | varies |
| `web/app/hooks/useWallet.ts` | Coin wallet state | varies |
| `web/app/hooks/useRed5Publisher.ts` | Red5 Pro WHIP publisher | varies |
| `web/app/hooks/useRed5Subscriber.ts` | Red5 Pro WHEP subscriber | varies |
| `web/app/hooks/useDeviceDetect.ts` | Mobile/desktop detection | varies |
| `web/app/data/constants.ts` | Channel IDs, reactions, test users | varies |
| `web/app/globals.css` | Global styles, animations | varies |
| `web/app/layout.tsx` | Root layout | varies |
| `web/tailwind.config.ts` | Tailwind configuration | varies |

### Config & Scripts

| File | Purpose |
|------|---------|
| `start.sh` | Runs backend + frontend together, validates .env |
| `backend/.env.example` | Template for backend env vars |
| `web/.env.example` | Template for frontend env vars |
| `IMPLEMENTATION_PLAN.md` | Original architecture plan (predates soccer refactor) |

### Static Assets

| Path | Contents |
|------|----------|
| `web/public/ads/ad-offer1.png` | Product image: tumbler (421KB) |
| `web/public/ads/ad-offer2.png` | Product image: meal (514KB) |
| `web/public/ads/ad-offer3.png` | Product image: (unused) |
| `web/public/ads/ad-offer4.png` | Product image: (unused) |
| `web/public/ads/ad-offer5.png` | Product image: trainers (139KB) |
| `web/public/ads/ad-offer6.png` | Product image: screen (264KB) |
| `web/public/ads/ad1.png, ad2.png, ad3.png` | Legacy ad images (unused) |
| `web/public/avatars/bot/01-08.png` | Bot avatar images |
| `web/public/videos/sample-stream.mp4` | Old demo video (NOT the soccer video) |
| `web/public/matchstats/badge_*.svg` | Team badges |

---

## PubNub Channels

| Channel | Purpose | Publisher | Subscriber |
|---------|---------|-----------|------------|
| `game.chat` | Simulated fan chat | Backend timeline | Frontend (liveStreamPage) |
| `game.commentary` | Soccer commentary text + timeCode | Backend timeline | Frontend (LiveCommentary) |
| `game.stream-reactions` | Emoji reactions | Backend timeline + Users | Frontend (liveStreamPage) |
| `game.bets` | Bet proposals | Backend timeline | Frontend (useBets) |
| `game.bet-results` | Bet results | Backend timeline | Frontend (useBets) |
| `game.product-highlight` | PRODUCT_HIGHLIGHT / PRODUCT_DISMISS | Backend timeline | Frontend (liveStreamPage) |
| `game.video-control` | STATUS with playbackTimeMs | Backend loop | Frontend (liveStreamPage) |
| `game.stream-status` | PiP WebRTC stream started/stopped | Frontend (publisher) | Frontend (watchers) |
| `game.server-control` | START/STOP/TOGGLE_CHAT commands | REST API / PubNub | Backend listener |

---

## Environment Setup

### Backend (`backend/.env`)

```
PUBNUB_PUBLISH_KEY=pub-c-xxxxx
PUBNUB_SUBSCRIBE_KEY=sub-c-xxxxx
PUBNUB_SECRET_KEY=sec-c-xxxxx
GUIDED_DEMO=true
PORT=3002
```

### Frontend (`web/.env`)

```
NEXT_PUBLIC_PUBNUB_PUBLISH_KEY=pub-c-xxxxx
NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY=sub-c-xxxxx
NEXT_PUBLIC_GUIDED_DEMO=true

# Red5 Pro (optional, for PiP camera feature)
NEXT_PUBLIC_RED5_HOST=userId-xxxx.cloud.red5.net
NEXT_PUBLIC_RED5_NODE_GROUP=Baselin-xxxx
NEXT_PUBLIC_RED5_APP=live
NEXT_PUBLIC_TURN_SERVER_URL=stun:stun2.l.google.com:19302
```

Both `.env` files must use the **same PubNub keyset** (same pub/sub keys).

---

## How to Run

```bash
# 1. Make start script executable
chmod +x start.sh

# 2. Run both servers
./start.sh

# 3. Open browser
open http://localhost:3000

# 4. Log in with any username

# 5. Start the backend simulation (in another terminal)
curl -X POST http://localhost:3002/start

# 6. Watch for:
#    - Soccer video playing (Vimeo embed)
#    - Chat messages appearing (bottom left)
#    - Commentary appearing (above chat, collapsible)
#    - Product cards appearing at 5s, 55s, 105s, 155s
#    - Emoji reactions floating up

# 7. Stop the simulation
curl -X POST http://localhost:3002/stop
```

---

## Known Issues & Risks

### Build Status (verified March 18, 2026)

```
$ cd web && rm -rf .next && npx next build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (6/6)

Route (app)              Size  First Load JS
┌ ○ /                  191 kB       336 kB
├ ○ /_not-found        986 B        102 kB
└ ○ /icon.svg            0 B          0 B
```

**The frontend builds without errors.** The backend also loads without errors (`node -e "require('./index.js')"`).

### Critical (Must Fix)

1. **Never tested end-to-end in a browser** — The code compiles successfully (verified above) but was never run with both frontend and backend together in a browser. The previous session had persistent `.next` cache corruption that has now been resolved.

2. **Vimeo `?background=1` may block `@vimeo/player` seeking** — The Vimeo embed uses `?background=1` which hides all controls and removes the Vimeo UI. This mode may prevent the `@vimeo/player` JavaScript SDK from calling `setCurrentTime()`. If video sync does not work, try removing `background=1` from the iframe `src` in `liveStreamPage.tsx` line 429.

### Medium

3. **Commentary is sparse in the first minute** — Commentary events are spread across 20 minutes of match time. The first event is at 2s but the second might be many seconds later. For a demo, you may want to add more early commentary events to `backend/game-data/commentary.js`. (Not seen in the front-end of the application)

4. **`react-player` was removed but `web/package-lock.json` and `web/yarn.lock` may have stale references** — The package was uninstalled via `npm uninstall react-player`, but if the lockfile is stale, a fresh `rm -rf node_modules && npm install` may be needed.

5. **`LoadingSpinnerSmall` is defined but unused** in `liveStreamPage.tsx` (lines 924-931). Harmless but creates a linter warning.

### Low

6. **Typos in commentary** — "leeds" should be "Leeds" and "lead's" should be "Leeds" in `commentary.js`.

7. **No commentary history for late joiners** — `LiveCommentary.tsx` only shows live messages. If a user joins after commentary has started, they see nothing until the next commentary event.

8. **`web/public/videos/sample-stream.mp4`** still exists on disk but is not referenced anywhere. Can be deleted.

---

VIDEO SYNCING FAILS AND WORKS IN /Users/markus.kohler/Documents/Cursor/pn-solution-live-events

## What Was Attempted (History)

This section documents every significant change attempted during the refactoring session, in chronological order.

### 1. Copied soccer commentary from reference project (Failed nothing seen in the front-end)
- Source: `/Users/markus.kohler/Documents/Cursor/pn-solution-live-events/backend/game-data/commentary.js`
- Filtered to only `game.commentary` events (removed polls, match-stats)
- Result: `backend/game-data/commentary.js` with 127 events

### 2. Replaced products with soccer merchandise (Failed these never appear)
- Original: Nintendo handheld products
- New: 4 soccer-themed products using existing ad images
- File: `backend/game-data/products.json`

### 3. Updated backend to publish products and video sync (Don't know if it failed)
- Added `CHANNELS.PRODUCTS` and `CHANNELS.VIDEO_CONTROL` to `backend/index.js`
- Created `buildProductEvents()` to generate timeline events from products.json
- Added video STATUS broadcast every second in `runLoop()`

### 4. Created `LiveCommentary.tsx` component (Not seen in the front-end)
- Subscribes to `game.commentary`
- Renders commentary messages with timeCode
- Collapsible UI

### 5. Created `ProductCardOverlay.tsx` component (Not seen in the front-end)
- Compact card (bottom-right) with product image, name, price
- Expandable to full bottom sheet with specs, condition, accessories
- "Add to Bag" button with animation

### 6. Created `CartPanel.tsx` component (Not seen in the front-end)
- Slide-out panel from right
- Shows cart items with quantity controls
- Persists to PubNub App Context via `useCart.ts`

### 7. Created `useCart.ts` hook
- Stores cart in PubNub user custom metadata (JSON string)
- CRUD operations: add, remove, update quantity, clear

### 8. Updated `liveStreamPage.tsx`
- Replaced `<video>` tag with Vimeo iframe embed
- Added subscriptions to `game.product-highlight` and `game.video-control`
- Added `@vimeo/player` integration for video seeking
- Added LiveCommentary, ProductCardOverlay, CartPanel to JSX
- Added shopping bag button to bottom bar

### 9. Removed `react-player` dependency
- Uninstalled via `npm uninstall react-player`
- Removed all `dynamic(() => import('react-player'))` imports
- Replaced with direct Vimeo iframe

### 10. Installed `@vimeo/player`
- `npm install @vimeo/player` in `web/`
- Used for programmatic seeking in video sync

### 11. Created `start.sh`
- Runs backend and frontend concurrently
- Validates .env files, installs deps if needed
- Ctrl+C cleanup trap

### 12. Cleaned up build environment (last action)
- Deleted `web/.next` (corrupted cache)
- Killed processes on ports 3000-3004
- **User never completed a clean restart after this cleanup**

---

## Reference Repos (Working Implementations)

Two other local repos have **working implementations** of the features we're struggling with. Use these as ground truth.

### 1. Red5 Pro Video Streaming — `/Users/markus.kohler/Documents/opensource/red5-truetime-auction`

This repo has a **working** Red5 Pro WHIP/WHEP implementation for live video streaming. The PiP camera feature in our project was modeled after this.

**Key files:**

| File | Purpose |
|------|---------|
| `src/hooks/useAuctioneerStream.ts` | WHIP publisher hook (camera → Red5) |
| `src/hooks/useAuctionClient.ts` | WHEP subscriber hook (Red5 → viewer) |
| `src/utils/auctionConfig.ts` | Stream config (host, ICE servers) |
| `src/Components/Auctioneer/AuctioneerVideoPublisher.tsx` | Publisher UI component |
| `src/Components/AuctioneerVideo.tsx` | Subscriber UI component |

**Working WHIP publisher pattern:**
```javascript
const red5prosdk = await import('red5pro-webrtc-sdk')
const whipEndpoint = `https://${config.host}/as/v1/proxy/whip/${config.app}/${streamName}`

const publisher = new red5prosdk.WHIPClient()
await publisher.init({
  endpoint: whipEndpoint,
  host: config.host,
  app: config.app,
  streamName: config.streamName,
  mediaElementId: 'red5pro-publisher',
  rtcConfiguration: { iceServers: config.iceServers },
  mediaConstraints: {
    audio: true,
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  },
  bandwidth: { audio: 56, video: 2000 },
})
await publisher.publish(streamName)
const stream = publisher.getMediaStream()
videoElement.srcObject = stream
```

**Working WHEP subscriber pattern:**
```javascript
const red5prosdk = await import('red5pro-webrtc-sdk')
const whepEndpoint = `https://${config.host}/as/v1/proxy/whep/${config.app}/${streamName}`

const subscriber = new red5prosdk.WHEPClient()
await subscriber.init({
  endpoint: whepEndpoint,
  host: config.host,
  app: config.app,
  streamName,
  mediaElementId: 'red5pro-subscriber',
  rtcConfiguration: { iceServers: config.iceServers },
})
await subscriber.subscribe()
```

**NPM dependency:** `"red5pro-webrtc-sdk": "^15.0.0"` (resolved to 15.2.0)

---

### 2. Video Syncing — `/Users/markus.kohler/Documents/Cursor/pn-solution-live-events`

This repo has **working video sync across tabs** for the exact same Vimeo video (`1073970603`). It uses `react-player` (not `@vimeo/player`).

**Key files:**

| File | Purpose |
|------|---------|
| `backend/index.js` | Publishes `STATUS` with `playbackTime` every second |
| `web/app/widget-stream/streamWidget.tsx` | Subscribes to video control, seeks ReactPlayer |
| `web/app/data/constants.ts` | Channel IDs (`game.client-video-control`) |

**How the backend publishes video time (WORKING):**
```javascript
// backend/index.js — called every 1000ms in runLoop()
async function publishVideoStatus() {
  const message = {
    type: "STATUS",
    params: {
      playbackTime: currentTime,       // milliseconds
      videoStarted: currentTime === 0,
      videoEnded: currentTime >= lastEventTime,
    },
  };
  await publishMessage("game.client-video-control", message);
}
```

**How the frontend handles sync (WORKING):**
```javascript
// web/app/widget-stream/streamWidget.tsx
function handleVideoControl(messageEvent, isVideoPlaying, isVideoStarted) {
  if (messageEvent.message.type == 'STATUS') {
    if (messageEvent.message.params.videoStarted) {
      setIsVideoPlaying(true)
      setRequestedVideoProgress(0)
      playerRef.current?.seekTo(0, 'seconds')
    }
    if (messageEvent.message.params.videoEnded) {
      setIsVideoPlaying(false)
    }
    actualVideoProgressRef.current = messageEvent.message.params.playbackTime / 1000

    if (!isVideoPlaying) {
      setIsVideoPlaying(true)
    }
    if (!isVideoStarted) {
      // Late join: seek to current position
      setRequestedVideoProgress(actualVideoProgressRef.current)
    }
  } else if (messageEvent.message.type == 'SEEK') {
    const requestedTime = messageEvent.message.params.playbackTime / 1000
    if (requestedTime) {
      setRequestedVideoProgress(requestedTime)
      if (isVideoPlaying) {
        playerRef.current?.seekTo(requestedTime, 'seconds')
      }
    }
  }
}
```

**Video player used:** `react-player` v2.16.0 with `ReactPlayer` component:
```jsx
<ReactPlayer
  ref={playerRef}
  url="https://vimeo.com/1073970603"
  playing={isVideoPlaying}
  controls={false}
  loop={false}
  muted={isMuted}
  onReady={onVideoReady}
  onStart={onVideoStart}
  onProgress={onVideoProgress}
  progressInterval={1000}
/>
```

**Key differences from our current approach:**

| Aspect | Reference (working) | Our project (untested) |
|--------|---------------------|----------------------|
| Video player | `react-player` | Vimeo iframe + `@vimeo/player` SDK |
| Seeking | `playerRef.current.seekTo(seconds, 'seconds')` | `vimeoPlayer.setCurrentTime(seconds)` |
| Drift threshold | None (applies every STATUS) | 3 seconds |
| Channel name | `game.client-video-control` | `game.video-control` |
| Message format | `{ type, params: { playbackTime } }` | `{ type, playbackTimeMs }` |
| Late join | Tracks `isVideoStarted` state | Not implemented |

**IMPORTANT:** The reference project uses `react-player` successfully. We removed `react-player` from our project due to Next.js 15 ESM/chunk-loading errors. If those errors were caused by stale `.next` cache (which we deleted), `react-player` might actually work now. Alternatively, our `@vimeo/player` approach should work too — it just needs testing.

---

## AI Handoff Prompt

Copy and paste the following into a new AI session:

---

**START OF PROMPT**

You are working on the project at `/Users/markus.kohler/Documents/opensource/live-shopping-red5`. Read `HANDOFF.md` at the project root first — it contains a complete audit of all files, architecture, and known issues.

**Goal**: Make this live shopping demo work end-to-end. The code changes are already written but were never successfully tested. Your job is to:

1. **Get it to build and run**:
   - Run `cd web && rm -rf .next node_modules && npm install && npm run build` to verify the frontend compiles
   - Fix any TypeScript or build errors
   - Run `cd backend && npm install` to verify the backend works
   - Test with `./start.sh` from the project root, then `curl -X POST http://localhost:3002/start`

2. **Verify each feature works in the browser** (open http://localhost:3000, log in with any name):
   - Soccer video plays (Vimeo embed, fullscreen)
   - Chat messages appear in bottom-left overlay after backend starts
   - Live commentary appears above chat (collapsible, with timeCode)
   - Product cards appear at 5s, 55s, 105s, 155s as overlays on bottom-right
   - Product cards can be tapped to expand, "Add to Bag" works
   - Shopping bag icon in bottom bar opens cart panel
   - Emoji reactions float up when clicked
   - Video is synced across multiple tabs (open two tabs, both should be at same position)

3. **Fix known risks** (see HANDOFF.md "Known Issues" section):
   - If video sync doesn't work, remove `background=1` from the Vimeo iframe src in `liveStreamPage.tsx` line 429
   - If `@vimeo/player` can't seek, consider switching to a self-hosted MP4 or changing Vimeo embed parameters
   - If commentary feels sparse, add more events in the first 60 seconds of `backend/game-data/commentary.js`

4. **Key files to look at if things break**:
   - `web/app/pages/liveStreamPage.tsx` — the main 932-line component with all subscriptions and UI
   - `backend/index.js` — the timeline engine (366 lines)
   - `web/app/data/constants.ts` — channel ID definitions
   - `backend/game-data/products.json` — product data and display timings
   - `web/app/components/LiveCommentary.tsx` — commentary overlay
   - `web/app/components/ProductCardOverlay.tsx` — product card

5. **PubNub setup**: Both `backend/.env` and `web/.env` already have working PubNub keys. The backend uses `GUIDED_DEMO=true` which means you must `POST /start` to begin the simulation.

6. **Reference repos with WORKING implementations** (use these as ground truth):
   - **Red5 Pro streaming**: `/Users/markus.kohler/Documents/opensource/red5-truetime-auction` — working WHIP/WHEP publisher/subscriber in `src/hooks/useAuctioneerStream.ts` and `src/hooks/useAuctionClient.ts`
   - **Video syncing**: `/Users/markus.kohler/Documents/Cursor/pn-solution-live-events` — working video sync in `web/app/widget-stream/streamWidget.tsx` (uses `react-player` + `playerRef.seekTo()`) and `backend/index.js` (publishes STATUS with playbackTime every second)
   - The video sync reference uses `react-player` v2.16.0 which works there. We removed it due to Next.js 15 chunk-loading errors, but those may have been caused by a corrupted `.next` cache. If `@vimeo/player` seeking doesn't work, consider re-adding `react-player` after a clean install.

7. **DO NOT**:
   - Remove the cart functionality (We need to change the products to the soccer ones though if not already done)
   - Change the UI/UX design (fullscreen video with overlays)
   - Change the PubNub channel names (they must match between backend and frontend)

**END OF PROMPT**

---
