'use client'

import { useRef, useEffect, useState, type ReactNode } from 'react'

interface SwipeContainerProps {
  leftPanel: ReactNode
  centerPanel: ReactNode
  rightPanel: ReactNode
  leftIndicatorCount?: number
  rightIndicatorCount?: number
}

export default function SwipeContainer({
  leftPanel,
  centerPanel,
  rightPanel,
  leftIndicatorCount = 0,
  rightIndicatorCount = 0,
}: SwipeContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState(1)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = el.clientWidth
  }, [])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== panel) setPanel(idx)
  }

  return (
    <div className="absolute inset-0 z-10">
      <div
        ref={scrollRef}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        style={{ overscrollBehaviorX: 'none' }}
        onScroll={handleScroll}
      >
        {/* Left panel — Bet History */}
        <div className="w-full h-full flex-shrink-0 snap-start">
          {leftPanel}
        </div>

        {/* Center panel — Main live view */}
        <div className="w-full h-full flex-shrink-0 snap-start relative">
          {centerPanel}

          {/* Left edge indicator */}
          <div
            className={`absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-500 flex flex-col items-center gap-1 ${
              panel === 1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="w-0.5 h-8 bg-white/20 rounded-full" />
            {leftIndicatorCount > 0 && (
              <div className="min-w-[16px] h-[16px] bg-amber-500 text-black text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                {leftIndicatorCount}
              </div>
            )}
          </div>

          {/* Right edge indicator */}
          <div
            className={`absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-500 flex flex-col items-center gap-1 ${
              panel === 1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="w-0.5 h-8 bg-white/20 rounded-full" />
            {rightIndicatorCount > 0 && (
              <div className="min-w-[16px] h-[16px] bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                {rightIndicatorCount}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Cart */}
        <div className="w-full h-full flex-shrink-0 snap-start">
          {rightPanel}
        </div>
      </div>
    </div>
  )
}
