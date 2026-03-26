'use client'

import type { WalkthroughMode } from './steps/types'

interface Props {
  title: string
  body: string
  mode: WalkthroughMode
  stepIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onEnd: () => void
  onSwitchMode: () => void
  isFirst: boolean
  isLast: boolean
}

function renderBody(body: string) {
  const parts = body.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded bg-blue-500/12 text-blue-300 text-[0.78rem] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function WalkthroughTooltip({
  title,
  body,
  mode,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onEnd,
  onSwitchMode,
  isFirst,
  isLast,
}: Props) {
  const modeLabel = mode === 'pubnub' ? 'PubNub' : 'Red5 Pro'
  const otherMode = mode === 'pubnub' ? 'Red5 Pro' : 'PubNub'
  const modeColor = mode === 'pubnub' ? 'text-red-400' : 'text-red-500'
  const modeBg = mode === 'pubnub' ? 'bg-red-500/10' : 'bg-red-500/10'
  const btnBg = mode === 'pubnub' ? 'bg-red-500 hover:bg-red-400' : 'bg-red-600 hover:bg-red-500'

  return (
    <div className="w-[min(400px,calc(100vw-32px))] bg-[rgba(13,13,20,0.95)] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden walkthrough-tooltip-in">
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-2 border-b border-white/[0.06]">
        <span className={`${modeBg} ${modeColor} font-bold text-[0.65rem] tracking-wider px-2 py-0.5 rounded-md`}>
          {modeLabel}
        </span>
        <h3 className="font-bold text-[0.95rem] text-white flex-1 truncate">
          {title}
        </h3>
        <button
          onClick={onEnd}
          className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-white/75 text-[0.85rem] leading-relaxed">
          {renderBody(body)}
        </p>
      </div>

      {/* Footer nav */}
      <div className="px-5 py-3 flex items-center gap-2 border-t border-white/[0.06] bg-white/[0.02]">
        <button
          disabled={isFirst}
          onClick={onPrev}
          className="flex items-center gap-1 text-white/50 text-xs font-semibold hover:text-white disabled:text-white/15 transition-colors cursor-pointer disabled:cursor-default"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <span className="text-white/30 text-[0.7rem] tabular-nums">
          {stepIndex + 1} / {totalSteps}
        </span>

        <div className="flex-1" />

        <button
          onClick={onSwitchMode}
          className="flex items-center gap-1 text-white/35 text-[0.68rem] font-semibold hover:text-white transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12M13 7l3 3-3 3M7 7L4 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {otherMode}
        </button>

        <button
          onClick={onNext}
          className={`${btnBg} text-white text-xs font-bold px-4 py-1.5 rounded-lg min-w-[80px] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1`}
        >
          {isLast ? 'Finish' : 'Next'}
          {!isLast && (
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
