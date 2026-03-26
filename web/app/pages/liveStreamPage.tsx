'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Chat, User, Channel, Message } from '@pubnub/chat'
import { useLiveCamera } from '../hooks/useLiveCamera'
import { useWallet } from '../hooks/useWallet'
import { useBets } from '../hooks/useBets'
import {
  streamReactionsChannelId,
  reactions,
  chatChannelId,
  productHighlightChannelId,
  videoControlChannelId,
  serverControlChannelId,
} from '../data/constants'
import ReactPlayer from 'react-player'
import BetCard from '../components/BetCard'
import BetHistory from '../components/BetHistory'
import CoinWallet from '../components/CoinWallet'
import CoinAnimation from '../components/CoinAnimation'
import LiveCommentary from '../components/LiveCommentary'
import ProductCardOverlay from '../components/ProductCardOverlay'
import CartPanel from '../components/CartPanel'
import { useCart } from '../hooks/useCart'
import type { Product, ProductMessage } from '../types/product'
import { useDeviceDetect } from '../hooks/useDeviceDetect'
import SwipeContainer from '../components/SwipeContainer'
import MobileTopSlot from '../components/MobileTopSlot'
const VIMEO_VIDEO_URL = 'https://vimeo.com/1073970603'

interface LiveStreamPageProps {
  chat: Chat
  userId: string
  streamName: string
  onLeave: () => void
}

export default function LiveStreamPage({
  chat,
  userId,
  streamName,
  onLeave,
}: LiveStreamPageProps) {
  const liveCamera = useLiveCamera(chat.sdk, userId)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoStarted, setIsVideoStarted] = useState(false)
  const [requestedVideoProgress, setRequestedVideoProgress] = useState(0)
  const actualVideoProgressRef = useRef(0)
  const isVideoPlayingRef = useRef(false)
  const isVideoStartedRef = useRef(false)
  const playerRef = useRef<any>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [users, setUsers] = useState<User[]>([])

  // Stream state
  const [occupancy, setOccupancy] = useState(0)
  const [uiVisible, setUiVisible] = useState(true)
  const uiTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reactionsContainerRef = useRef<HTMLDivElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const lastReactionTimeRef = useRef(0)

  // Betting state
  const wallet = useWallet(chat)
  const bets = useBets(chat)
  const [showBetHistory, setShowBetHistory] = useState(false)
  const [coinAnimType, setCoinAnimType] = useState<'win' | 'loss' | null>(null)
  const [coinAnimAmount, setCoinAnimAmount] = useState(0)

  // Product highlight state
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [showCart, setShowCart] = useState(false)
  const cart = useCart(chat)

  // PiP streaming state
  const [pipMinimized, setPipMinimized] = useState(false)
  const [startingDemo, setStartingDemo] = useState(false)

  // Responsive layout
  const { isMobile } = useDeviceDetect()

  useEffect(() => {
    isVideoPlayingRef.current = isVideoPlaying
    isVideoStartedRef.current = isVideoStarted
  }, [isVideoPlaying, isVideoStarted])

  // Handle bet results -> coin animations
  useEffect(() => {
    if (!bets.lastResult) return
    const { bet } = bets.lastResult

    if (bet) {
      const won = bet.selectedOptionId === bets.lastResult.result.winningOptionId
      if (won) {
        const payout = Math.floor(bet.wager * bet.odds)
        wallet.addCoins(payout)
        setCoinAnimType('win')
        setCoinAnimAmount(payout)
      } else {
        setCoinAnimType('loss')
        setCoinAnimAmount(bet.wager)
      }
    }
    bets.clearLastResult()
  }, [bets.lastResult])

  const resetUiTimer = useCallback(() => {
    setUiVisible(true)
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current)
    uiTimeoutRef.current = setTimeout(() => setUiVisible(false), 5000)
  }, [])

  // Initialize chat, reactions, and stream-status subscriptions
  useEffect(() => {
    if (!chat) return

    let unsubscribeMessages = () => {}

    async function setup() {
      const channel = await chat.getChannel(chatChannelId)
      if (!channel) return
      setActiveChannel(channel)

      unsubscribeMessages = channel.connect((message: Message) => {
        setChatMessages(prev => {
          if (prev.some(m => m.timetoken === message.timetoken)) return prev
          return [...prev, message].slice(-50)
        })
      })

      const usersResult = await chat.getUsers()
      setUsers(usersResult.users || [])
    }

    setup()

    // Reactions subscription
    const reactionsChannel = chat.sdk.channel(streamReactionsChannelId)
    const reactionsSub = reactionsChannel.subscription({
      receivePresenceEvents: true,
    })
    reactionsSub.onMessage = messageEvent => {
      const msg = messageEvent.message as any
      if (msg.type === 'reaction') {
        spawnFloatingEmoji(msg.text)
      }
    }
    reactionsSub.onPresence = (presenceEvent: any) => {
      if (presenceEvent?.occupancy > 0) {
        setOccupancy(presenceEvent.occupancy)
      }
    }
    chat.sdk
      .hereNow({ channels: [streamReactionsChannelId] })
      .then(result => {
        if (result) setOccupancy(result.totalOccupancy + 1)
      })
    reactionsSub.subscribe()

    // Product highlight subscription
    const productCh = chat.sdk.channel(productHighlightChannelId)
    const productSub = productCh.subscription()
    productSub.onMessage = (messageEvent) => {
      const msg = messageEvent.message as unknown as ProductMessage
      if (msg.type === 'PRODUCT_HIGHLIGHT' && msg.product) {
        setActiveProduct(msg.product)
      } else if (msg.type === 'PRODUCT_DISMISS') {
        setActiveProduct(null)
      }
    }
    productSub.subscribe()

    return () => {
      unsubscribeMessages()
      reactionsSub.unsubscribe()
      productSub.unsubscribe()
    }
  }, [chat])

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  // Subscribe to video sync control channel
  useEffect(() => {
    if (!chat) return

    const videoCh = chat.sdk.channel(videoControlChannelId)
    const videoSub = videoCh.subscription({ receivePresenceEvents: false })
    videoSub.onMessage = (messageEvent) => {
      handleVideoControl(
        messageEvent,
        isVideoPlayingRef.current,
        isVideoStartedRef.current
      )
    }
    videoSub.subscribe()

    return () => {
      videoSub.unsubscribe()
    }
  }, [chat])

  function handleVideoControl(messageEvent: any, playing: boolean, started: boolean) {
    const msg = messageEvent.message
    if (msg.type === 'STATUS') {
      if (msg.params.videoStarted) {
        setIsVideoPlaying(true)
        setRequestedVideoProgress(0)
        playerRef.current?.seekTo(0, 'seconds')
      }
      if (msg.params.videoEnded) {
        setIsVideoPlaying(false)
      }
      actualVideoProgressRef.current = msg.params.playbackTime / 1000
      if (!playing) {
        setIsVideoPlaying(true)
      }
      if (!started) {
        setRequestedVideoProgress(actualVideoProgressRef.current)
      }
    } else if (msg.type === 'SEEK') {
      const requestedTime = msg.params.playbackTime / 1000
      if (requestedTime) {
        setRequestedVideoProgress(requestedTime)
        if (playing) {
          playerRef.current?.seekTo(requestedTime, 'seconds')
        }
      }
    }
  }

  function onVideoStart() {
    setIsVideoStarted(true)
    if (requestedVideoProgress > 0) {
      playerRef.current?.seekTo(requestedVideoProgress, 'seconds')
    }
  }

  function spawnFloatingEmoji(emoji: string) {
    if (!reactionsContainerRef.current) return
    const el = document.createElement('div')
    el.textContent = emoji
    el.className = 'absolute text-3xl pointer-events-none animate-float-up'
    el.style.left = `${Math.random() * 80 + 10}%`
    el.style.bottom = '0'
    el.style.zIndex = '30'
    reactionsContainerRef.current.appendChild(el)
    el.addEventListener('animationend', () => {
      try { reactionsContainerRef.current?.removeChild(el) } catch {}
    })
    setTimeout(() => {
      try { reactionsContainerRef.current?.removeChild(el) } catch {}
    }, 2500)
  }

  async function sendReaction(emoji: string) {
    const now = Date.now()
    if (now - lastReactionTimeRef.current < 500) return
    lastReactionTimeRef.current = now

    await chat.sdk.publish({
      message: { text: emoji, type: 'reaction' },
      channel: streamReactionsChannelId,
    })
  }

  async function sendChatMessage() {
    if (!activeChannel || !chatInput.trim()) return
    try {
      await activeChannel.sendText(chatInput)
      setChatInput('')
    } catch (err) {
      console.error('Error sending message:', err)
    }
  }

  async function startDemo() {
    if (startingDemo) return
    setStartingDemo(true)
    try {
      await chat.sdk.publish({
        channel: serverControlChannelId,
        message: { type: 'START' },
      })
    } catch (err) {
      console.error('Failed to start demo:', err)
    }
    setTimeout(() => setStartingDemo(false), 3000)
  }

  function handlePlaceBet(proposal: any, optionId: string, wager: number) {
    if (!wallet.canAfford(wager)) return
    wallet.removeCoins(wager)
    bets.placeBet(proposal, optionId, wager)
  }

  function getUserName(uid: string): string {
    if (uid === chat.currentUser.id) return 'You'
    const user = users.find(u => u.id === uid)
    return user?.name?.split(' ')[0] || 'User'
  }

  function formatTimeLeft(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="relative w-screen h-[100dvh] bg-black overflow-hidden select-none"
      onClick={resetUiTimer}
    >
      {/* Full-screen soccer video (react-player) */}
      <div data-walkthrough-id="video-player" className="absolute inset-0 z-0 overflow-hidden">
        {isVideoPlaying ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-[177.78vh] min-h-[56.25vw] w-[177.78vh] h-[56.25vw] pointer-events-none">
            <ReactPlayer
              ref={playerRef}
              url={VIMEO_VIDEO_URL}
              playing={isVideoPlaying}
              controls={false}
              width="100%"
              height="100%"
              loop={false}
              muted={true}
              pip={false}
              onStart={onVideoStart}
              progressInterval={1000}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-5 max-w-xs text-center">
              {startingDemo ? (
                <>
                  <LoadingSpinner />
                  <div className="text-white/70 text-lg font-medium">Starting stream...</div>
                </>
              ) : (
                <>
                  <div className="text-5xl">⚽</div>
                  <div className="text-white/90 text-xl font-bold">Live Shopping Demo</div>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Start the live stream to see chat, commentary, products, and betting overlays in real time.
                  </p>
                  <button
                    className="mt-2 px-8 py-3 bg-accent hover:bg-accent-light text-white font-semibold text-sm rounded-xl cursor-pointer active:scale-[0.97] transition-all hover:brightness-110 shadow-lg shadow-accent/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      startDemo()
                    }}
                  >
                    Start Demo
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Coin animation overlay */}
      <CoinAnimation
        type={coinAnimType}
        amount={coinAnimAmount}
        onComplete={() => {
          setCoinAnimType(null)
          setCoinAnimAmount(0)
        }}
      />

      {isMobile ? (
        /* ===== MOBILE LAYOUT ===== */
        <>
          <div
            ref={reactionsContainerRef}
            className="absolute bottom-44 right-0 w-1/3 h-48 z-20 pointer-events-none overflow-hidden"
          />

          <SwipeContainer
            leftPanel={
              <BetHistory
                bets={bets.placedBets}
                totalWinnings={bets.totalWinnings}
                totalLost={bets.totalLost}
                coins={wallet.coins}
                onClose={() => {}}
                inline
              />
            }
            centerPanel={
              <div className="relative w-full h-full">
                {/* Mobile top bar */}
                <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-2 safe-area-top safe-area-x">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-live px-2.5 py-1 rounded-full gap-1.5">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-live" />
                      <span className="text-white text-[10px] font-bold">LIVE</span>
                    </div>
                    <div className="bg-black/50 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full">
                      {occupancy.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Mobile PiP button (idle) */}
                    {liveCamera.mode === 'idle' && (
                      <button
                        className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
                        onClick={e => {
                          e.stopPropagation()
                          liveCamera.remoteActive ? liveCamera.watchStream() : liveCamera.goLive()
                        }}
                      >
                        {liveCamera.remoteActive ? <WatchIcon /> : <CameraIconLarge />}
                      </button>
                    )}
                    <CoinWallet coins={wallet.coins} bouncing={wallet.bouncing} />
                    <button
                      className="bg-black/50 backdrop-blur-sm text-white p-2 rounded-full cursor-pointer hover:bg-white/20"
                      onClick={onLeave}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                {/* Mobile top content — PiP above commentary, flows naturally */}
                <div className="absolute top-14 left-0 right-0 z-20 safe-area-top flex flex-col gap-2 px-3">
                  {/* PiP preview — sits above commentary when active */}
                  {liveCamera.mode === 'publishing' && (
                    <div className="relative w-24 h-36 rounded-xl overflow-hidden shadow-lg border-2 border-red-500/50 self-start">
                      <video
                        ref={liveCamera.localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 flex items-center gap-1 bg-red-600 rounded-full px-1.5 py-0.5">
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse-live" />
                        <span className="text-white text-[8px] font-bold">LIVE</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                        <button
                          className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white cursor-pointer backdrop-blur-sm"
                          onClick={e => { e.stopPropagation(); liveCamera.toggleMic() }}
                        >
                          {liveCamera.isMicOn ? <MicIconSmall /> : <MicOffIconSmall />}
                        </button>
                        <button
                          className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white cursor-pointer"
                          onClick={e => { e.stopPropagation(); liveCamera.stopLive() }}
                        >
                          <StopIcon />
                        </button>
                      </div>
                    </div>
                  )}

                  {liveCamera.mode === 'watching' && (
                    <div className="relative w-24 h-36 rounded-xl overflow-hidden shadow-lg border-2 border-live/40 bg-black self-start">
                      <video
                        ref={liveCamera.remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 flex items-center gap-1 bg-live/90 rounded-full px-1.5 py-0.5">
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse-live" />
                        <span className="text-white text-[8px] font-bold">LIVE</span>
                      </div>
                      <button
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white/60 cursor-pointer"
                        onClick={e => { e.stopPropagation(); liveCamera.stopWatching() }}
                      >
                        <CloseIconSmall />
                      </button>
                    </div>
                  )}

                  {/* Commentary / BetCard */}
                  <MobileTopSlot
                    commentary={<LiveCommentary chat={chat} fullWidth />}
                    betCard={bets.activeBet ? (
                      <BetCard
                        proposal={bets.activeBet}
                        coins={wallet.coins}
                        onPlaceBet={handlePlaceBet}
                        onTimeout={() => {}}
                      />
                    ) : null}
                  />

                  {/* Product card */}
                  {activeProduct && (
                    <ProductCardOverlay
                      product={activeProduct}
                      onDismiss={() => setActiveProduct(null)}
                      onAddToBag={(product) => cart.addItem(product)}
                      horizontal
                    />
                  )}
                </div>

                {/* Mobile bottom section */}
                <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col safe-area-x">
                  {/* Chat messages */}
                  <div
                    ref={chatScrollRef}
                    className="overflow-y-auto hide-scrollbar chat-mask space-y-0.5 max-h-[22vh] px-4"
                  >
                    {chatMessages.slice(-12).map((msg, i) => (
                      <div
                        key={`${msg.timetoken}-${i}`}
                        className="animate-fade-in-up px-0.5 py-[3px]"
                      >
                        <span className="text-[12px] leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          <span className="font-semibold text-amber-300/80">{getUserName(msg.userId)}</span>
                          {' '}
                          <span className="text-white/90">{msg.content.text}</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Emoji reactions */}
                  <div className="flex items-center justify-center gap-0.5 py-1 pointer-events-auto">
                    {reactions.map(emoji => (
                      <button
                        key={emoji}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-2xl cursor-pointer hover:bg-white/10 active:scale-90 transition-all"
                        onClick={e => {
                          e.stopPropagation()
                          sendReaction(emoji)
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Chat input */}
                  <div className="px-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
                    <div className="flex items-end bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2">
                      <textarea
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Say something..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder-white/50 text-sm border-none outline-none min-w-0 resize-none leading-snug max-h-16 hide-scrollbar"
                        style={{ fontSize: '16px' }}
                        onInput={e => {
                          const t = e.target as HTMLTextAreaElement
                          t.style.height = 'auto'
                          t.style.height = Math.min(t.scrollHeight, 64) + 'px'
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendChatMessage()
                            const t = e.target as HTMLTextAreaElement
                            t.style.height = 'auto'
                          }
                        }}
                      />
                      {chatInput.trim() && (
                        <button
                          className="ml-2 w-6 h-6 flex items-center justify-center cursor-pointer text-white/70 hover:text-white active:scale-90 transition-all shrink-0"
                          onClick={() => sendChatMessage()}
                        >
                          <SendIcon />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            }
            rightPanel={
              <CartPanel
                items={cart.items}
                totalItems={cart.totalItems}
                totalPrice={cart.totalPrice}
                onUpdateQuantity={cart.updateQuantity}
                onRemove={cart.removeItem}
                onClear={cart.clearCart}
                onClose={() => {}}
                inline
              />
            }
            leftIndicatorCount={bets.placedBets.length}
            rightIndicatorCount={cart.totalItems}
          />
        </>
      ) : (
        /* ===== DESKTOP LAYOUT ===== */
        <>
          {/* PiP box — top left, below top bar */}
          {!pipMinimized && (
            <div data-walkthrough-id="pip-camera" className="absolute top-20 left-4 z-30 safe-area-top safe-area-x">
              {liveCamera.mode === 'idle' && (
                <div className="w-44 h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 relative">
                  {liveCamera.remoteActive ? (
                    <button
                      onClick={e => { e.stopPropagation(); liveCamera.watchStream() }}
                      className="flex flex-col items-center gap-2.5 cursor-pointer group"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                        <WatchIcon />
                      </div>
                      <span className="text-white/60 text-sm font-medium text-center leading-tight group-hover:text-white/80 transition-colors">Watch Stream</span>
                    </button>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); liveCamera.goLive() }}
                      className="flex flex-col items-center gap-2.5 cursor-pointer group"
                    >
                      <div className="w-16 h-16 rounded-full bg-accent/20 group-hover:bg-accent/30 flex items-center justify-center transition-colors">
                        <CameraIconLarge />
                      </div>
                      <span className="text-white/60 text-sm font-medium text-center leading-tight group-hover:text-white/80 transition-colors">Go Live</span>
                    </button>
                  )}
                  <button
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white/40 cursor-pointer hover:text-white/70"
                    onClick={e => { e.stopPropagation(); setPipMinimized(true) }}
                  >
                    <MinimizeIcon />
                  </button>
                </div>
              )}

              {liveCamera.mode === 'publishing' && (
                <div className="relative w-44 h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-red-500/50">
                  <video
                    ref={liveCamera.localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-red-600 rounded-full px-2.5 py-1 shadow-lg">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-live" />
                      <span className="text-white text-[10px] font-bold">LIVE</span>
                      <div className="w-px h-3 bg-white/30" />
                      <span className={`text-[10px] font-bold tabular-nums ${liveCamera.timeLeft <= 10 ? 'text-red-200 animate-pulse' : 'text-white/90'}`}>
                        {formatTimeLeft(liveCamera.timeLeft)}
                      </span>
                    </div>
                  </div>
                  {liveCamera.error && (
                    <div className="absolute top-10 left-2 right-2 bg-black/70 rounded-lg px-2 py-1">
                      <span className="text-yellow-300 text-[9px] leading-tight block">{liveCamera.error.slice(0, 50)}</span>
                    </div>
                  )}
                  <div className="absolute bottom-11 left-0 right-0 h-[3px] bg-black/40">
                    <div
                      className="h-full bg-white/80 transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${(liveCamera.timeLeft / liveCamera.LIVE_DURATION_SECONDS) * 100}%` }}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <button
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-white/30 backdrop-blur-sm"
                      onClick={e => { e.stopPropagation(); liveCamera.toggleMic() }}
                    >
                      {liveCamera.isMicOn ? <MicIconSmall /> : <MicOffIconSmall />}
                    </button>
                    <button
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-white/30 backdrop-blur-sm"
                      onClick={e => { e.stopPropagation(); liveCamera.switchCamera() }}
                    >
                      <FlipCameraIconSmall />
                    </button>
                    <button
                      className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white cursor-pointer hover:bg-red-500"
                      onClick={e => { e.stopPropagation(); liveCamera.stopLive() }}
                    >
                      <StopIcon />
                    </button>
                  </div>
                </div>
              )}

              {liveCamera.mode === 'watching' && (
                <div className="relative w-44 h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-live/40 bg-black">
                  <video
                    ref={liveCamera.remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!liveCamera.isConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black gap-3 p-4">
                      {liveCamera.remoteUserId && (
                        <img
                          src={`/avatars/bot/${liveCamera.remoteUserId.replace('user-', '')}.png`}
                          alt="Host"
                          className="w-16 h-16 rounded-full border-2 border-live/60 shadow-lg"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-live rounded-full animate-pulse" />
                        <span className="text-white text-xs font-bold">
                          {liveCamera.isConnecting ? 'Connecting...' : 'Host is Live'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-live/90 rounded-full px-2.5 py-1 shadow-lg">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-live" />
                      <span className="text-white text-[10px] font-bold">LIVE</span>
                      <div className="w-px h-3 bg-white/30" />
                      <span className={`text-[10px] font-bold tabular-nums ${liveCamera.timeLeft <= 10 ? 'text-red-200 animate-pulse' : 'text-white/80'}`}>
                        {formatTimeLeft(liveCamera.timeLeft)}
                      </span>
                    </div>
                    <button
                      className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white/60 cursor-pointer hover:text-white backdrop-blur-sm"
                      onClick={e => {
                        e.stopPropagation()
                        liveCamera.stopWatching()
                      }}
                    >
                      <CloseIconSmall />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Minimized PiP restore button */}
          {pipMinimized && (
            <button
              className="absolute top-20 left-5 z-30 safe-area-top safe-area-x w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
              onClick={e => { e.stopPropagation(); setPipMinimized(false) }}
            >
              <CameraIconLarge />
            </button>
          )}

          {/* Top bar: LIVE badge + viewer count + coin wallet */}
          <div
            className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-5 pb-3 safe-area-top safe-area-x transition-opacity duration-300 ${
              uiVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center bg-live px-3.5 py-1.5 rounded-full gap-1.5">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse-live" />
                <span className="text-white text-xs font-bold">LIVE</span>
              </div>
              <div data-walkthrough-id="viewer-count" className="bg-black/50 backdrop-blur-sm text-white text-xs px-3.5 py-1.5 rounded-full">
                {occupancy.toLocaleString()} watching
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <CoinWallet coins={wallet.coins} bouncing={wallet.bouncing} />
              <button
                className="bg-black/50 backdrop-blur-sm text-white p-2.5 rounded-full cursor-pointer hover:bg-white/20"
                onClick={onLeave}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Floating reactions container — emoji animations */}
          <div
            ref={reactionsContainerRef}
            className="absolute bottom-28 right-0 w-1/2 h-64 z-20 pointer-events-none overflow-hidden"
          />

          {/* Bet history panel */}
          {showBetHistory && (
            <BetHistory
              bets={bets.placedBets}
              totalWinnings={bets.totalWinnings}
              totalLost={bets.totalLost}
              coins={wallet.coins}
              onClose={() => setShowBetHistory(false)}
            />
          )}

          {/* Cart panel */}
          {showCart && (
            <CartPanel
              items={cart.items}
              totalItems={cart.totalItems}
              totalPrice={cart.totalPrice}
              onUpdateQuantity={cart.updateQuantity}
              onRemove={cart.removeItem}
              onClear={cart.clearCart}
              onClose={() => setShowCart(false)}
            />
          )}

          {/* Right column — product card + commentary + bet card */}
          <div className="absolute top-20 right-0 z-20 w-72 safe-area-top safe-area-x flex flex-col gap-3">
            {activeProduct && (
              <div data-walkthrough-id="product-card" className="pointer-events-auto">
                <ProductCardOverlay
                  product={activeProduct}
                  onDismiss={() => setActiveProduct(null)}
                  onAddToBag={(product) => {
                    cart.addItem(product)
                  }}
                />
              </div>
            )}
            <div data-walkthrough-id="commentary" className="pointer-events-auto">
              <LiveCommentary chat={chat} />
            </div>
            {bets.activeBet && (
              <div data-walkthrough-id="bet-card" className="pointer-events-auto">
                <BetCard
                  proposal={bets.activeBet}
                  coins={wallet.coins}
                  onPlaceBet={handlePlaceBet}
                  onTimeout={() => {}}
                />
              </div>
            )}
          </div>

          {/* Chat messages — bottom left */}
          <div data-walkthrough-id="chat-messages" className="absolute bottom-28 left-6 z-10 max-w-[55%] pointer-events-auto">
            <div
              ref={chatScrollRef}
              className="overflow-y-auto hide-scrollbar chat-mask space-y-0.5 max-h-[25vh]"
            >
              {chatMessages.slice(-15).map((msg, i) => (
                <div
                  key={`${msg.timetoken}-${i}`}
                  className="animate-fade-in-up px-0.5 py-[3px]"
                >
                  <span className="text-[13px] leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    <span className="font-semibold text-amber-300/80">{getUserName(msg.userId)}</span>
                    {' '}
                    <span className="text-white/90">{msg.content.text}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Emoji reactions — centered, floating above input */}
          <div data-walkthrough-id="emoji-reactions" className="absolute bottom-16 left-0 right-0 z-20 flex items-center justify-center gap-1 pointer-events-none safe-area-x">
            {reactions.map(emoji => (
              <button
                key={emoji}
                className="w-12 h-12 flex items-center justify-center rounded-full text-3xl cursor-pointer hover:bg-white/10 active:scale-90 transition-all pointer-events-auto"
                onClick={e => {
                  e.stopPropagation()
                  sendReaction(emoji)
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat input — matches chat messages position exactly */}
          <div className="absolute bottom-0 left-6 z-20 w-[38%]" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex items-end bg-black/40 backdrop-blur-sm rounded-xl px-3.5 py-2.5">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Say something..."
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-white/50 text-sm border-none outline-none min-w-0 resize-none leading-snug max-h-20 hide-scrollbar"
                style={{ fontSize: '16px' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 80) + 'px'
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChatMessage()
                    const t = e.target as HTMLTextAreaElement
                    t.style.height = 'auto'
                  }
                }}
              />
              {chatInput.trim() && (
                <button
                  className="ml-2 w-6 h-6 flex items-center justify-center cursor-pointer text-white/70 hover:text-white active:scale-90 transition-all shrink-0"
                  onClick={() => {
                    sendChatMessage()
                  }}
                >
                  <SendIcon />
                </button>
              )}
            </div>
          </div>

          {/* Action buttons — bottom right */}
          <div className="absolute bottom-0 right-6 z-20 flex items-center gap-2" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
            <button
              className="relative w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white/60 flex items-center justify-center cursor-pointer hover:bg-white/15 transition-colors"
              onClick={e => {
                e.stopPropagation()
                setShowBetHistory(false)
                setShowCart(true)
              }}
            >
              <ShoppingBagIcon />
              {cart.totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {cart.totalItems}
                </span>
              )}
            </button>

            <button
              className="relative w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white/60 flex items-center justify-center cursor-pointer hover:bg-white/15 transition-colors"
              onClick={e => {
                e.stopPropagation()
                setShowCart(false)
                setShowBetHistory(true)
              }}
            >
              <BetHistoryIcon />
              {bets.placedBets.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-amber-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {bets.placedBets.length}
                </span>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// --- Icons ---

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloseIconSmall() {
  return (
    <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
      <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function CameraIconLarge() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white/70">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  )
}

function WatchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  )
}

function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
      <path d="M4 10h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function MicIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
    </svg>
  )
}

function MicOffIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.55-.9l4.18 4.18L21 19.73 4.27 3z" />
    </svg>
  )
}

function FlipCameraIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5h1.5c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5h1.5c0 2.76-2.24 5-5 5zm0-10c2.76 0 5 2.24 5 5h-1.5c0-1.93-1.57-3.5-3.5-3.5S8.5 11.07 8.5 13H7c0-2.76 2.24-5 5-5z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

function ChatBubbleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
    </svg>
  )
}

function ShoppingBagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function BetHistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-white/10" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-accent" />
    </svg>
  )
}

function LoadingSpinnerSmall() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-white/10" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-white/60" />
    </svg>
  )
}
