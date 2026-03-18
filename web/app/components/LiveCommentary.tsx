'use client'

import { useState, useEffect, useRef } from 'react'
import type { Chat } from '@pubnub/chat'
import { commentaryChannelId } from '../data/constants'

interface CommentaryMessage {
  timetoken: string
  text: string
  timeCode: string
}

interface LiveCommentaryProps {
  chat: Chat
  fullWidth?: boolean
}

export default function LiveCommentary({ chat, fullWidth }: LiveCommentaryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<CommentaryMessage[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!chat) return

    const channel = chat.sdk.channel(commentaryChannelId)
    const subscription = channel.subscription({ receivePresenceEvents: false })

    subscription.onMessage = (messageEvent) => {
      const msg = messageEvent.message as any
      const newMsg: CommentaryMessage = {
        timetoken: messageEvent.timetoken,
        text: msg.text || '',
        timeCode: msg.timeCode || '',
      }

      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.timetoken))
        if (seen.has(newMsg.timetoken)) return prev
        return [...prev, newMsg].slice(-30)
      })
    }

    subscription.subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [chat])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) return null

  return (
    <div className={`bg-black/50 backdrop-blur-md rounded-xl border border-white/[0.08] overflow-hidden ${fullWidth ? 'w-full' : 'w-72'}`}>
      <button
        className="flex items-center gap-2 w-full px-3 py-2 cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(!expanded)
        }}
      >
        <MicIcon />
        <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">
          Commentary
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 20 20"
          fill="none"
          className={`text-white/30 transition-transform ml-auto ${
            expanded ? 'rotate-180' : ''
          }`}
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className={`overflow-y-auto hide-scrollbar space-y-1 px-3 pb-2.5 transition-all duration-300 ${
          expanded ? 'max-h-32' : 'max-h-14'
        }`}
      >
        {messages.slice(expanded ? -8 : -3).map((msg) => (
          <div
            key={msg.timetoken}
            className="flex items-start gap-2 animate-fade-in-up"
          >
            <span className="text-white/25 text-[10px] font-mono mt-px shrink-0 w-7 text-right">
              {msg.timeCode}
            </span>
            <span className="text-white/70 text-[11px] leading-snug">
              {msg.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-amber-400"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
    </svg>
  )
}
