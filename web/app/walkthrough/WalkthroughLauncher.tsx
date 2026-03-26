'use client'

import { useState, useRef, useEffect } from 'react'
import { useWalkthrough, hasSeenWalkthrough } from './WalkthroughProvider'

function TourOption({
  icon,
  label,
  description,
  accentColor,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  accentColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl text-left w-full border border-white/[0.06] bg-white/[0.02] transition-all hover:-translate-y-px cursor-pointer group"
      style={{
        ['--accent' as string]: accentColor,
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[0.82rem] text-white leading-tight">{label}</div>
        <div className="text-[0.72rem] text-white/40 leading-snug mt-0.5">{description}</div>
      </div>
      <span className="text-white/15 text-base mt-0.5 flex-shrink-0 group-hover:text-white/30 transition-colors">
        ›
      </span>
    </button>
  )
}

export default function WalkthroughLauncher() {
  const { isActive, mode, currentStepIndex, totalSteps, startTour, endTour } = useWalkthrough()
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const showBeacon = !hasSeenWalkthrough()

  // Close popover on outside click
  useEffect(() => {
    if (!showPopover) return
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        fabRef.current && !fabRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPopover])

  // Active tour: show compact progress indicator
  if (isActive) {
    const dotColor = mode === 'pubnub' ? 'bg-red-500 shadow-[0_0_8px_rgba(229,56,59,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
    const modeLabel = mode === 'pubnub' ? 'PubNub' : 'Red5'

    return (
      <div className="fixed bottom-[72px] right-4 z-[9997] flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(13,13,20,0.9)] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-white/60 text-[0.7rem] font-semibold">{modeLabel} Tour</span>
        <span className="text-white/35 text-[0.7rem] tabular-nums">{currentStepIndex + 1}/{totalSteps}</span>
        <button
          onClick={endTour}
          className="ml-1 text-white/30 hover:text-white transition-colors cursor-pointer flex items-center"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ? FAB */}
      <button
        ref={fabRef}
        onClick={() => setShowPopover(!showPopover)}
        className={`fixed bottom-[72px] right-4 z-[9997] w-10 h-10 rounded-full bg-white/[0.08] text-white/60 backdrop-blur-xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)] flex items-center justify-center cursor-pointer hover:bg-white/[0.14] hover:text-white transition-all ${
          showBeacon ? 'walkthrough-beacon' : ''
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>

      {/* Popover */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="fixed bottom-[120px] right-4 z-[9997] w-[300px] bg-[rgba(13,13,20,0.95)] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] walkthrough-tooltip-in"
        >
          <h4 className="font-bold text-[0.9rem] text-white mb-0.5">Explore the Demo</h4>
          <p className="text-white/40 text-[0.75rem] mb-4">Choose a guided tour to see how it works</p>

          <div className="flex flex-col gap-2">
            <TourOption
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              }
              label="PubNub Tour"
              description="Real-time messaging, presence, and data sync"
              accentColor="#3B82F6"
              onClick={() => {
                setShowPopover(false)
                startTour('pubnub')
              }}
            />
            <TourOption
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              }
              label="Red5 Pro Tour"
              description="Ultra-low latency live video streaming"
              accentColor="#EF4444"
              onClick={() => {
                setShowPopover(false)
                startTour('red5')
              }}
            />
          </div>

          <p className="text-white/20 text-[0.65rem] text-center mt-3">
            Arrow keys to navigate &middot; Esc to close
          </p>
        </div>
      )}
    </>
  )
}
