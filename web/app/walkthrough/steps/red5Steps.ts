import type { WalkthroughStep } from './types'

export const red5Steps: WalkthroughStep[] = [
  {
    id: 'r5-pip',
    targetSelector: '[data-walkthrough-id="pip-camera"]',
    title: 'WebRTC Picture-in-Picture',
    body: 'The PiP camera uses **WebRTC** peer-to-peer connections coordinated through PubNub signaling. Users can go live from their browser — no app install, no streaming server required for the demo.',
    placement: 'right',
    mode: 'red5',
    order: 1,
  },
  {
    id: 'r5-signaling',
    targetSelector: '[data-walkthrough-id="pip-camera"]',
    title: 'PubNub as Signaling Server',
    body: 'WebRTC requires a signaling channel for SDP offer/answer exchange and ICE candidates. PubNub\'s **Pub/Sub** handles all signaling — the `useLiveCamera` hook publishes offers and listens for answers on a dedicated channel.',
    placement: 'right',
    mode: 'red5',
    order: 2,
  },
  {
    id: 'r5-golive',
    targetSelector: '[data-walkthrough-id="pip-camera"]',
    title: 'Go Live / Watch',
    body: 'The **publisher** captures camera + mic via `getUserMedia`, creates an RTCPeerConnection, and signals through PubNub. The **subscriber** receives the offer, creates an answer, and renders the remote stream — all in real-time with sub-second latency.',
    placement: 'right',
    mode: 'red5',
    order: 3,
  },
  {
    id: 'r5-video',
    targetSelector: '',
    title: 'Main Video Stream',
    body: 'The primary video uses **Vimeo** as the delivery layer. In production, Red5 Pro replaces this with **WHEP** (WebRTC-HTTP Egress Protocol) for sub-500ms latency — critical for live shopping where product reveals need to sync with purchase windows.',
    placement: 'center',
    mode: 'red5',
    order: 4,
  },
  {
    id: 'r5-summary',
    targetSelector: '',
    title: 'Red5 Pro + PubNub',
    body: 'Red5 Pro provides **ultra-low latency video** (WHIP/WHEP), PubNub provides **real-time data** (chat, reactions, sync). Together they power interactive live shopping — viewers see products the instant they appear and can purchase before they sell out.',
    placement: 'center',
    mode: 'red5',
    order: 5,
  },
]
