'use client'

import { useState, useEffect, type ReactNode } from 'react'

interface MobileTopSlotProps {
  commentary: ReactNode
  betCard: ReactNode | null
}

export default function MobileTopSlot({ commentary, betCard }: MobileTopSlotProps) {
  const [showBet, setShowBet] = useState(false)

  useEffect(() => {
    if (betCard) setShowBet(true)
    else setShowBet(false)
  }, [!!betCard])

  const showingBet = showBet && betCard

  return (
    <div className="w-full relative">
      {showingBet ? (
        <div className="relative">
          {betCard}
          <button
            className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-2 py-0.5 cursor-pointer active:scale-95 transition-transform"
            onClick={(e) => {
              e.stopPropagation()
              setShowBet(false)
            }}
          >
            <span className="text-[10px]">🎙</span>
            <span className="text-white/50 text-[9px] font-semibold">Live</span>
          </button>
        </div>
      ) : (
        <div className="relative">
          {commentary}
          {betCard && (
            <button
              className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-full px-2 py-0.5 cursor-pointer active:scale-95 transition-transform"
              onClick={(e) => {
                e.stopPropagation()
                setShowBet(true)
              }}
            >
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-amber-300 text-[9px] font-bold">Bet</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
