'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Chat } from '@pubnub/chat'
import { motion, AnimatePresence } from 'framer-motion'
import { testUsers, channelData, STARTING_COINS } from '../data/constants'

interface LoginPageProps {
  setChat: (chat: Chat) => void
  setUserId: (userId: string) => void
  onLoginStart: () => void
}

export default function LoginPage({
  setChat,
  setUserId,
  onLoginStart,
}: LoginPageProps) {
  const [userArray, setUserArray] = useState<typeof testUsers | null>(null)
  const [loadMessage, setLoadMessage] = useState('Initializing...')
  const [isReady, setIsReady] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [hoveredUser, setHoveredUser] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (!process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY) {
        setLoadMessage('No PubNub Publish Key Found')
        return
      }
      if (!process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY) {
        setLoadMessage('No PubNub Subscribe Key Found')
        return
      }

      try {
        const tempUserId = 'user-02'
        const localChat = await Chat.init({
          publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY as string,
          subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY as string,
          userId: tempUserId,
        })

        const testUser = await localChat.getUser('user-01')
        if (!testUser) {
          setLoadMessage('Setting up users...')
          const promises = testUsers.map(user =>
            localChat.getUser(user.id).then(existing => {
              if (!existing) {
                return localChat.createUser(user.id, {
                  name: user.name,
                  profileUrl: user.avatar,
                  email: user.email,
                  externalId: user.externalId,
                  type: 'member',
                  custom: {
                    location: user.location,
                    jobTitle: user.jobTitle,
                    currentMood: user.currentMood,
                    socialHandle: user.socialHandle,
                    timezone: user.timezone,
                    score: 0,
                    coins: STARTING_COINS,
                  },
                })
              }
            })
          )
          await Promise.all(promises)
        }

        const testChannel = await localChat.getChannel(channelData[0].id)
        if (!testChannel) {
          setLoadMessage('Setting up channels...')
          for (const ch of channelData) {
            if (ch.createInAppContext) {
              const existing = await localChat.getChannel(ch.id)
              if (!existing) {
                await localChat.createPublicConversation({
                  channelId: ch.id,
                  channelData: {
                    name: ch.name,
                    description: ch.description,
                    custom: { profileUrl: ch.avatar },
                  },
                })
              }
            }
          }
        }

        setIsReady(true)
        setLoadMessage('')
      } catch {
        setLoadMessage('Could not initialize. Check your PubNub keys.')
      }
    }

    const shuffle = (array: typeof testUsers) =>
      [...array].sort(() => Math.random() - 0.5)
    const nonBots = testUsers.filter(user => user.id.includes('user'))
    setUserArray(shuffle(nonBots))
    init()
  }, [])

  async function login(userId: string) {
    setIsLoggingIn(true)
    onLoginStart()
    try {
      const localChat = await Chat.init({
        publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY as string,
        subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY as string,
        userId,
      })
      setChat(localChat)
      setUserId(userId)
    } catch {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-[100dvh] w-screen bg-[#080808] select-none safe-area-x overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[30%] -left-[15%] w-[60%] h-[60%] rounded-full bg-red-600/[0.04] blur-[100px]" />
        <div className="absolute -bottom-[20%] -right-[15%] w-[50%] h-[50%] rounded-full bg-red-500/[0.03] blur-[80px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoggingIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <Spinner size={44} />
            <div className="mt-3 text-white/70 text-base font-medium">
              Joining the stream...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 flex flex-col items-center w-full max-w-md px-5"
      >
        {/* Top: Logos */}
        <div className="flex items-center gap-2.5 mb-5">
          <Image
            src="/pubnub-logos/pubnub.svg"
            alt="PubNub"
            width={88}
            height={26}
            className="brightness-0 invert opacity-50"
          />
          <span className="text-white/15 text-sm">&times;</span>
          <span className="text-white/50 text-xs font-semibold tracking-wider">RED5 PRO</span>
        </div>

        {/* Hero — compact */}
        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight text-center mb-1.5">
          Soccer Live
        </h1>
        <p className="text-xs md:text-sm text-white/35 font-light text-center mb-4 max-w-[280px]">
          Interactive live streaming with real-time chat, betting &amp; reactions
        </p>

        {/* Feature row — inline, single line */}
        <div className="flex items-center gap-1.5 mb-5">
          {[
            { icon: '📺', label: 'Stream' },
            { icon: '💬', label: 'Chat' },
            { icon: '🎲', label: 'Betting' },
            { icon: '⚡', label: 'WebRTC' },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1"
            >
              <span className="text-[10px]">{f.icon}</span>
              <span className="text-[10px] text-white/40 font-medium">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Avatar grid — the main event */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] text-white/25 uppercase tracking-[0.15em] font-medium">
              Pick your player
            </span>
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-400/15 rounded-full px-2.5 py-1">
              <span className="text-[10px]">🪙</span>
              <span className="text-amber-300/80 text-[10px] font-bold">{STARTING_COINS} coins</span>
            </div>
          </div>

          {!isReady && (
            <div className="flex flex-col items-center gap-4">
              <div className="grid grid-cols-4 gap-2 w-full">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 py-2">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/[0.03] animate-shimmer" />
                    <div className="w-10 h-2.5 rounded-full bg-white/[0.03] animate-shimmer" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-white/30 text-xs">
                <Spinner size={14} />
                <span>{loadMessage}</span>
              </div>
            </div>
          )}

          {isReady && userArray && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-4 gap-2 w-full">
                {userArray.slice(0, 8).map((user, index) => (
                  <motion.button
                    key={user.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    className="group relative flex flex-col items-center gap-1.5 py-2 px-1 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-white/[0.05] active:scale-95"
                    onClick={() => login(user.id)}
                    onMouseEnter={() => setHoveredUser(user.id)}
                    onMouseLeave={() => setHoveredUser(null)}
                    disabled={isLoggingIn}
                  >
                    <div className="relative">
                      <div
                        className={`absolute -inset-0.5 rounded-2xl transition-all duration-300 ${
                          hoveredUser === user.id
                            ? 'bg-gradient-to-b from-red-500/25 to-red-600/10 scale-105'
                            : 'bg-transparent scale-100'
                        }`}
                      />
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        className={`relative rounded-2xl transition-all duration-200 ${
                          hoveredUser === user.id
                            ? 'ring-2 ring-red-500/50 scale-[1.03]'
                            : 'ring-1 ring-white/[0.08]'
                        }`}
                        width={60}
                        height={60}
                        priority={index < 4}
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-medium text-center leading-tight transition-colors duration-200 ${
                        hoveredUser === user.id ? 'text-white' : 'text-white/40'
                      }`}
                    >
                      {user.name.split(' ')[0]}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-white/15 text-center mt-5">
          Powered by PubNub Chat SDK &middot; Red5 Pro WebRTC
        </p>
      </motion.div>
    </div>
  )
}

function Spinner({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-white/[0.06]"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-red-500"
      />
    </svg>
  )
}
