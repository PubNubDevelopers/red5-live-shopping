# Live Shopping + Red5 Pro — Implementation Plan

## Overview

Transform the existing PubNub Live Shopping demo into a modern, full-screen live shopping experience powered by **Red5 Pro** for real-time video streaming. This plan covers replacing the video layer, redesigning the UI, and removing unused features (PubNub Functions, polling).

---

## Current State

| Component | Current Tech | Target |
|-----------|-------------|--------|
| Video | React-Player (Vimeo URL) | Red5 Pro WebRTC (WHIP/WHEP) |
| Chat | PubNub Chat SDK | **Keep** (works well) |
| Reactions | PubNub Pub/Sub | **Keep** (works well) |
| Polling | PubNub Pub/Sub | **Remove** |
| PubNub Functions | Cloud Functions (moderation) | **Remove** |
| Commentary | PubNub Pub/Sub | **Keep** (optional) |
| UI Layout | Device preview frame (375×812) | Full-screen immersive |
| Styling | Tailwind + HeroUI | Tailwind + HeroUI (modernized) |

---

## Phase 1: Remove Unused Features

### 1.1 Remove Polling System
- **Delete** `web/app/widget-polls/pollsWidget.tsx`
- **Delete** `web/app/widget-polls/liveStreamPoll.tsx`
- Remove poll channels from `web/app/data/constants.ts`:
  - `game.new-poll`
  - `game.poll-votes`
  - `game.poll-results`
- Remove poll subscriptions from `sportsEventPage.tsx`
- Remove poll-related backend scripts: `backend/game-data/polls.js`
- Remove poll references from `commonLogic.ts` and alert system

### 1.2 Remove PubNub Functions
- **Delete** `functions/` directory entirely
- Remove any references to moderation functions in chat widget
- Remove moderation metadata handling from `ChatMessage.tsx`
- Remove `backend/illuminate/illuminate-polls.js`

### 1.3 Clean Up Side Menu / Demo Controls
- Remove or simplify `web/app/side-menu/` (no longer needed for demo orchestration)
- Remove guided demo toggle logic from `page.tsx`
- Remove `salesIntroPage.tsx` if not needed
- Remove the device-frame preview wrappers (`previewMobile.tsx`, `previewTablet.tsx`)

---

## Phase 2: Integrate Red5 Pro Video Streaming

### 2.1 Install Dependencies

```bash
cd web
npm install red5pro-webrtc-sdk@15.0.0
```

> **Reference**: `red5-truetime-auction/package.json` uses `"red5pro-webrtc-sdk": "^15.0.0"`

### 2.2 Create Red5 Pro Configuration

**New file**: `web/app/config/red5Config.ts`

```typescript
export const getRed5StreamConfig = (streamName: string) => ({
  host: process.env.NEXT_PUBLIC_RED5_HOST || 'your-host.cloud.red5.net',
  app: 'live',
  streamName,
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  bandwidth: {
    audio: 56,
    video: 2000,
  },
  mediaConstraints: {
    audio: true,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  },
})
```

**Update `.env.example`** to add:
```
NEXT_PUBLIC_RED5_HOST=your-host.cloud.red5.net
NEXT_PUBLIC_RED5_STREAM_NAME=live-shopping-stream
```

> **Reference files**:
> - `red5-truetime-auction/src/utils/streamConfig.ts`
> - `red5-truetime-meetings/src/utils/conferenceConfig.ts`

### 2.3 Create Subscriber Hook (Viewer Side)

**New file**: `web/app/hooks/useRed5Subscriber.ts`

This hook handles subscribing to a live Red5 stream using **WHEP** (WebRTC-HTTP Egress Protocol).

```typescript
// Key pattern from red5-truetime-auction/src/hooks/useAuctionClient.ts:
//
// 1. Import red5pro-webrtc-sdk dynamically
// 2. Create WHEPClient instance
// 3. Initialize with endpoint: https://{host}/as/v1/proxy/whep/{app}/{streamName}
// 4. Call subscriber.subscribe()
// 5. Attach stream to <video> element
// 6. Handle connection state, errors, reconnection
// 7. Clean up on unmount
```

**Hook API**:
```typescript
const { videoRef, isConnected, isLoading, error, retry } = useRed5Subscriber(streamName)
```

### 2.4 Create Publisher Hook (Host/Broadcaster Side)

**New file**: `web/app/hooks/useRed5Publisher.ts`

This hook handles publishing a live stream using **WHIP** (WebRTC-HTTP Ingestion Protocol).

```typescript
// Key pattern from red5-truetime-auction/src/hooks/useAuctioneerStream.ts:
//
// 1. Get user media (camera + mic)
// 2. Create WHIPClient instance
// 3. Initialize with endpoint: https://{host}/as/v1/proxy/whip/{app}/{streamName}
// 4. Call publisher.publish(streamName)
// 5. Attach MediaStream to <video> element
// 6. Expose controls: toggleMic(), toggleCamera(), switchCamera()
// 7. Clean up on unmount
```

**Hook API**:
```typescript
const {
  videoRef,
  isPublishing,
  isMicOn,
  isCameraOn,
  toggleMic,
  toggleCamera,
  startPublishing,
  stopPublishing,
} = useRed5Publisher(streamName)
```

### 2.5 Replace StreamWidget

**Rewrite**: `web/app/widget-stream/streamWidget.tsx`

Replace `ReactPlayer` with a native `<video>` element connected to Red5 Pro:

```tsx
// Subscriber (viewer) mode:
<video
  ref={videoRef}
  id="red5pro-subscriber"
  autoPlay
  playsInline
  muted={false}
  className="w-full h-full object-cover"
/>

// Publisher (host) mode:
<video
  ref={videoRef}
  id="red5pro-publisher"
  autoPlay
  playsInline
  muted
  className="w-full h-full object-cover"
/>
```

- Remove all React-Player imports and logic
- Remove backend video control message handling (`START_STREAM`, `STATUS`, `SEEK`, `END_STREAM`)
- Remove timeline synchronization code
- Keep the reactions overlay (emoji floating) — it works independently

### 2.6 Update Backend

- Remove video control publishing from `backend/index.js` (the `game.client-video-control` channel)
- Optionally add a PubNub signal when the host starts/stops streaming so viewers know when to connect
- Keep chat, reactions, and commentary data generators

---

## Phase 3: Full-Screen Modern UI Redesign

### 3.1 Layout Architecture

Move from a **device preview frame** to a **full-screen immersive layout** (think TikTok Live / Instagram Live Shopping):

```
┌─────────────────────────────────────┐
│          FULL-SCREEN VIDEO          │
│         (Red5 Pro Stream)           │
│                                     │
│  ┌─────────┐                        │
│  │  LIVE 🔴 │  ○ 1,234 viewers     │
│  └─────────┘                        │
│                                     │
│                                     │
│                     ┌──────────────┐│
│                     │  Product     ││
│                     │  Card        ││
│                     │  (overlay)   ││
│                     └──────────────┘│
│                                     │
│  ┌──────────────────────────────┐   │
│  │  Chat messages (transparent  │   │
│  │  overlay, scrolling up)      │   │
│  │  user1: love this!           │   │
│  │  user2: how much?            │   │
│  └──────────────────────────────┘   │
│                                     │
│  [💬 Type...] [👍❤️😂😮👏]         │
│  ──────────────────────────────────│
│  [🛒 Products] [💬 Chat] [ℹ️ Info] │
└─────────────────────────────────────┘
```

### 3.2 Component Changes

| Component | Change |
|-----------|--------|
| `page.tsx` | Remove state machine for demo pages. Single route: video + overlays |
| `header.tsx` | Replace with minimal floating header (LIVE badge + viewer count) |
| `sportsEventPage.tsx` | Refactor into main `LiveStreamPage` — full viewport container |
| `streamWidget.tsx` | Full-screen `<video>` with Red5, no wrapper frame |
| `chatWidget.tsx` | Transparent overlay on bottom-left of video, messages fade in/out |
| `ChatMessage.tsx` | Semi-transparent pill-style messages (dark bg with blur) |
| `MessageInput.tsx` | Floating input bar at bottom of screen |
| `advertsWidget.tsx` | Convert to a swipeable product card overlay (bottom-right) |
| `commentaryWidget.tsx` | Optional: small ticker at top of screen |
| `matchStatsWidget.tsx` | Remove (sports-specific) |
| `botWidget.tsx` | Remove or repurpose |
| `guideOverlay.tsx` | Remove (demo-specific) |
| `loginPage.tsx` | Simplify to just name entry + role selection (host vs viewer) |

### 3.3 Styling Updates

**Global theme changes in `tailwind.config.ts`**:
- Dark-first color scheme (video-centric UI works best on dark)
- Add glassmorphism utilities (backdrop-blur, semi-transparent backgrounds)
- Update primary colors to match your brand

**Key CSS patterns**:
```css
/* Chat overlay on video */
.chat-overlay {
  @apply absolute bottom-20 left-4 right-24 max-h-[40vh] overflow-hidden;
  mask-image: linear-gradient(transparent 0%, black 30%);
}

/* Message pill */
.chat-message {
  @apply bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm mb-1;
}

/* Floating reactions */
.reactions-bar {
  @apply absolute bottom-20 right-4 flex flex-col gap-2;
}

/* Product card overlay */
.product-card {
  @apply absolute bottom-32 right-4 w-48 bg-white/90 backdrop-blur rounded-xl shadow-xl p-3;
}
```

### 3.4 Mobile Design

The mobile experience is critical — most live shopping viewers will be on phones. The design follows a **mobile-first** approach inspired by TikTok Live, Instagram Live, and YouTube Live Shopping.

#### Mobile Viewer Layout (Portrait — Primary)

```
┌──────────────────────────┐
│ ┌──────┐    ┌──┐ ┌──┐   │
│ │LIVE🔴│    │👤│ │✕ │   │  ← Floating top bar
│ │1.2K  │    └──┘ └──┘   │
│ └──────┘                 │
│                          │
│    FULL-SCREEN VIDEO     │
│    (Red5 Pro Stream)     │
│    object-fit: cover     │
│    100vh × 100vw         │
│                          │
│              ┌──────────┐│
│              │ 🛍️       ││
│              │ Product  ││  ← Tappable product card
│              │ $29.99   ││    (slides in from right)
│              │ [Buy →]  ││
│              └──────────┘│
│                          │
│ ┌────────────────────┐ 👍│
│ │ user1: love this!  │ ❤️│  ← Chat overlay (left)
│ │ user2: how much?   │ 😂│    Reactions (right)
│ │ user3: 🔥🔥🔥      │ 😮│
│ └────────────────────┘ 👏│
│                          │
│ ┌──────────────────────┐ │
│ │ 💬 Say something...  │ │  ← Sticky input bar
│ └──────────────────────┘ │
│ [🛒 Shop] [💬] [⋯ More] │  ← Bottom tab bar
└──────────────────────────┘
```

#### Mobile Host Layout (Portrait)

```
┌──────────────────────────┐
│ ┌──────┐    ┌──┐ ┌──┐   │
│ │LIVE🔴│    │🔄│ │✕ │   │  ← Flip camera button
│ │1.2K  │    └──┘ └──┘   │
│ └──────┘                 │
│                          │
│    FULL-SCREEN VIDEO     │
│    (Red5 Pro Publisher)  │
│    Front/back camera     │
│                          │
│                          │
│                          │
│ ┌────────────────────┐   │
│ │ Chat overlay        │   │  ← See viewer messages
│ │ (read-only scroll)  │   │
│ └────────────────────┘   │
│                          │
│ ┌──────────────────────┐ │
│ │🎤  📷  🛍️+  💬  ⏹️ │ │  ← Host controls
│ └──────────────────────┘ │  Mic | Camera | Add Product
└──────────────────────────┘    | Chat | End Stream
```

#### Mobile-Specific Considerations

**Touch & Gestures:**
- Swipe up on product card to dismiss, swipe down to expand details
- Tap video to toggle UI overlay visibility (auto-hide after 3s)
- Double-tap to send a heart reaction (like TikTok/Instagram)
- Pull-down gesture to minimize stream (picture-in-picture on supported devices)
- Use `react-swipeable` (already a dependency) for gesture handling

**Viewport & Video:**
- Use `100dvh` (dynamic viewport height) to account for mobile browser chrome
- Video element: `object-fit: cover` to fill entire viewport without letterboxing
- Publisher uses portrait-oriented constraints on mobile:
  ```typescript
  // Mobile media constraints (portrait)
  mediaConstraints: {
    audio: true,
    video: {
      width: { ideal: 720 },
      height: { ideal: 1280 },  // Portrait
      frameRate: { ideal: 30 },
      facingMode: 'user',  // Front camera default
    },
  }
  ```
- Add `switchCamera()` to toggle between `facingMode: 'user'` and `'environment'`
- Handle orientation changes gracefully — lock to portrait or adapt layout

**Safe Areas & Notch Handling:**
```css
/* Respect device safe areas (notch, home indicator) */
.stream-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

**Keyboard Handling:**
- When chat input is focused, the keyboard pushes up the input bar only
- Video stays full-screen behind the keyboard
- Use `visualViewport` API to detect keyboard height and adjust chat position
- Auto-dismiss keyboard on scroll or tap outside input

**Performance on Mobile:**
- Lazy-load product images
- Limit visible chat messages to last 50 (already near this in current code)
- Use `will-change: transform` on animated elements (reactions, chat scroll)
- Debounce reaction sends (max 1 per 500ms) to prevent spam
- Consider Adaptive Bitrate (ABR) — Red5 Pro supports this natively

**Bottom Sheet for Products:**
- Tapping "Shop" tab opens a draggable bottom sheet with the product catalog
- Sheet has 3 snap points: closed, half-screen, full-screen
- Products displayed in a scrollable grid (2 columns)
- Each product card: image, name, price, "Add to Cart" button
- Implement with CSS `transform` + touch drag (or a lightweight library)

#### Mobile Landscape (Secondary — Viewer Only)

```
┌───────────────────────────────────────────────────────┐
│ LIVE🔴 1.2K                              [👤] [✕]    │
│                                                       │
│                  FULL-SCREEN VIDEO                    │
│                                                       │
│ ┌──────────────────┐                          👍 ❤️   │
│ │ Chat messages     │                          😂 😮  │
│ │ (compact overlay) │    ┌──────────┐          👏     │
│ │ user1: nice!      │    │ Product  │                 │
│ └──────────────────┘    │ $29.99   │                 │
│ [💬 Type...]            └──────────┘                 │
└───────────────────────────────────────────────────────┘
```

- Chat overlay narrower (left 40% of screen)
- Product card floats center-right
- Reactions stacked vertically on far right
- Controls auto-hide after 3s, tap to show

#### Responsive Breakpoints

```typescript
// Tailwind breakpoints for the app
// Mobile-first: base styles = mobile
// sm (640px): Large phones / small tablets
// md (768px): Tablets
// lg (1024px): Desktop
// xl (1280px): Large desktop

// Key responsive decisions:
// < 768px  → Mobile layout (portrait-optimized, touch-first)
// >= 768px → Desktop layout (side panels possible, mouse-friendly)
```

**New file**: `web/app/hooks/useDeviceDetect.ts`
```typescript
// Detect mobile vs desktop for layout decisions
// - Check viewport width + touch capability
// - Detect orientation changes
// - Provide isMobile, isTablet, isLandscape flags
// - Handle resize events with debounce
```

#### Mobile-First Component Adaptations

| Component | Mobile | Desktop |
|-----------|--------|---------|
| Chat | Transparent overlay, bottom-left, max 40% height | Side panel option or overlay |
| Reactions | Vertical stack, bottom-right, large touch targets (44px min) | Same position, smaller |
| Product card | Compact card overlay + bottom sheet for catalog | Larger card overlay |
| Input bar | Full-width, sticky above bottom tabs | Full-width at bottom |
| Host controls | Icon-only toolbar, centered bottom | Labeled buttons, bottom bar |
| LIVE badge | Top-left, compact | Top-left, can include more info |
| Login page | Single column, large touch inputs | Centered card layout |

### 3.5 New Page Flow

```
Landing Page (/)
  ├── Enter name
  ├── Select role: "Host" or "Viewer"
  └── Enter stream name
       │
       ├── Host → /stream/host
       │   └── Full-screen publisher + chat overlay + product management
       │
       └── Viewer → /stream/watch
           └── Full-screen subscriber + chat overlay + product cards + reactions
```

---

## Phase 4: Product / Shopping Features

### 4.1 Keep Existing Ad/Product System (Simplified)

- Reuse `advertsWidget.tsx` data and product images from `backend/game-data/products.json`
- Display as floating product cards over the video
- Host can trigger product highlights via PubNub message on a `game.product-highlight` channel
- Viewers see a "Buy Now" or "Add to Cart" button on the card

### 4.2 Product Card Overlay

```typescript
// Product highlight message
{
  type: 'PRODUCT_HIGHLIGHT',
  product: {
    id: string,
    name: string,
    price: number,
    image: string,
    url: string,
  }
}
```

---

## File-by-File Change Summary

### Delete
- `web/app/widget-polls/` (entire directory)
- `functions/` (entire directory)
- `web/app/side-menu/` (entire directory)
- `web/app/pages/salesIntroPage.tsx`
- `web/app/components/guideOverlay.tsx`
- `web/app/components/previewMobile.tsx`
- `web/app/components/previewTablet.tsx`
- `web/app/widget-matchstats/` (entire directory)
- `web/app/widget-bot/` (entire directory)
- `backend/illuminate/` (entire directory)
- `backend/game-data/polls.js`

### Create
- `web/app/config/red5Config.ts` — Red5 Pro connection config (with mobile-aware media constraints)
- `web/app/hooks/useRed5Subscriber.ts` — WHEP viewer hook
- `web/app/hooks/useRed5Publisher.ts` — WHIP broadcaster hook (with camera flip support)
- `web/app/hooks/useDeviceDetect.ts` — Mobile/tablet/desktop detection + orientation tracking

### Major Rewrite
- `web/app/widget-stream/streamWidget.tsx` — Replace React-Player with Red5 `<video>`
- `web/app/page.tsx` — Simplified routing (host vs viewer)
- `web/app/pages/sportsEventPage.tsx` → rename to `liveStreamPage.tsx` — Full-screen layout
- `web/app/widget-chat/chatWidget.tsx` — Transparent overlay style
- `web/app/widget-chat/components/ChatMessage.tsx` — Pill-style messages
- `web/app/widget-chat/components/MessageInput.tsx` — Floating input
- `web/app/components/header.tsx` — Minimal floating LIVE badge
- `web/app/pages/loginPage.tsx` — Simplified login with role selection
- `web/app/globals.css` — Dark theme, glassmorphism, new animations
- `web/tailwind.config.ts` — Updated color palette
- `web/app/data/constants.ts` — Remove poll channels, add Red5 config

### Minor Updates
- `web/app/widget-adverts/advertsWidget.tsx` — Floating product card
- `web/app/commonLogic.ts` — Remove poll/function references
- `web/app/layout.tsx` — Dark mode default
- `web/.env.example` — Add Red5 env vars
- `web/package.json` — Add `red5pro-webrtc-sdk`, remove `react-player`
- `backend/index.js` — Remove video control timeline, keep chat/reactions

---

## Reference Code Locations

These files from other repos contain the exact patterns we need:

| Need | Reference File |
|------|---------------|
| WHEP subscriber setup | `red5-truetime-auction/src/hooks/useAuctionClient.ts` |
| WHIP publisher setup | `red5-truetime-auction/src/hooks/useAuctioneerStream.ts` |
| Stream config pattern | `red5-truetime-auction/src/utils/streamConfig.ts` |
| Conference SDK (advanced) | `red5-truetime-meetings/src/hooks/useConferenceClient.ts` |
| Video element styling | `red5-truetime-auction/src/Components/Auctioneer/AuctioneerVideoPublisher.tsx` |
| Media controls (mute/camera) | `red5-truetime-auction/src/hooks/useAuctioneerStream.ts` |
| Full config with ICE/TURN | `red5-truetime-meetings/src/utils/conferenceConfig.ts` |

---

## Environment Setup

```bash
# .env.local
NEXT_PUBLIC_PUBNUB_PUBLISH_KEY=your-pubnub-pub-key
NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY=your-pubnub-sub-key
NEXT_PUBLIC_RED5_HOST=your-instance.cloud.red5.net
NEXT_PUBLIC_RED5_STREAM_NAME=live-shopping-demo
```

---

## Estimated Effort by Phase

| Phase | Scope |
|-------|-------|
| Phase 1 | Remove polling, functions, demo controls |
| Phase 2 | Red5 Pro integration (publisher + subscriber) |
| Phase 3 | Full-screen UI redesign |
| Phase 4 | Product overlay features |

---

## Architecture Diagram

```
┌──────────────┐     WHIP      ┌─────────────────┐     WHEP      ┌──────────────┐
│   HOST APP   │ ──────────►   │  RED5 PRO CLOUD  │ ──────────►  │  VIEWER APP  │
│  (Publisher)  │   WebRTC     │  (Media Server)   │   WebRTC    │ (Subscriber)  │
└──────┬───────┘               └─────────────────┘               └──────┬───────┘
       │                                                                │
       │  PubNub Pub/Sub                                    PubNub Sub  │
       │  (chat, reactions,                          (chat, reactions,  │
       │   product highlights)                        product highlights)│
       ▼                                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PUBNUB CLOUD                                    │
│  Channels: game.chat, game.stream-reactions, game.product-highlight     │
└─────────────────────────────────────────────────────────────────────────┘
```
