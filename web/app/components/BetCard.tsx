'use client'

import { useState, useEffect, useRef } from 'react'
import type { BetProposal } from '../types/bet'

interface BetCardProps {
  proposal: BetProposal
  coins: number
  onPlaceBet: (proposal: BetProposal, optionId: string, wager: number) => void
  onTimeout: () => void
}

const WAGER_PRESETS = [25, 50, 100, 250]

const categoryIcons: Record<string, string> = {
  goal: '⚽',
  card: '🟨',
  corner: '🚩',
  result: '🏆',
  misc: '🎯',
}

export default function BetCard({ proposal, coins, onPlaceBet, onTimeout }: BetCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [wager, setWager] = useState(50)
  const [timeLeft, setTimeLeft] = useState(proposal.durationSec)
  const [placed, setPlaced] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    setSelectedOption(null)
    setWager(50)
    setPlaced(false)
    setTimeLeft(proposal.durationSec)

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          onTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [proposal.id])

  function handlePlaceBet() {
    if (!selectedOption || wager <= 0 || wager > coins || placed) return
    setPlaced(true)
    onPlaceBet(proposal, selectedOption, wager)
  }

  const progress = (timeLeft / proposal.durationSec) * 100
  const icon = categoryIcons[proposal.category] || '🎯'
  const selectedOdds = proposal.options.find(o => o.id === selectedOption)?.odds

  if (placed) {
    return (
      <div className="animate-bet-slide-up">
        <div className="bg-black/60 backdrop-blur-xl border border-green-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-green-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="font-semibold text-xs">Bet placed!</span>
          </div>
          <p className="text-white/40 text-[11px] mt-1">
            {wager} coins on &quot;{proposal.options.find(o => o.id === selectedOption)?.label}&quot;
            {selectedOdds && <span className="text-white/50"> &middot; {selectedOdds}x</span>}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-bet-slide-up">
      <div className="bg-black/60 backdrop-blur-xl border border-amber-500/20 rounded-xl overflow-hidden">
        {/* Countdown bar */}
        <div className="h-0.5 bg-white/5 relative">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="px-4 pt-3 pb-3.5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base shrink-0">{icon}</span>
              <h3 className="text-white font-bold text-xs leading-tight truncate">{proposal.question}</h3>
            </div>
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5 shrink-0 ml-2">
              <span className={`text-[10px] font-mono font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white/60'}`}>
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* Options as compact side-by-side buttons */}
          <div className="flex gap-2 mb-2.5">
            {proposal.options.map(option => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={`flex-1 py-2 px-2.5 rounded-lg text-center transition-all cursor-pointer border ${
                  selectedOption === option.id
                    ? 'bg-amber-500/25 border-amber-400/40 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:border-white/15'
                }`}
              >
                <div className="text-xs font-semibold">{option.label}</div>
                <div className={`text-[10px] mt-0.5 font-medium ${
                  selectedOption === option.id ? 'text-amber-400/80' : 'text-white/30'
                }`}>
                  {option.odds}x
                </div>
              </button>
            ))}
          </div>

          {/* Wager row -- compact inline */}
          {selectedOption && (
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-1.5 mb-2">
                {WAGER_PRESETS.filter(w => w <= coins).map(preset => (
                  <button
                    key={preset}
                    onClick={() => setWager(preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      wager === preset
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white/5 rounded-lg border border-white/[0.08] px-2.5">
                  <span className="text-xs mr-1">🪙</span>
                  <input
                    type="number"
                    value={wager}
                    onChange={e => setWager(Math.min(coins, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="flex-1 bg-transparent text-white text-xs py-1.5 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    min={1}
                    max={coins}
                  />
                  <span className="text-white/20 text-[10px]">/{coins}</span>
                </div>

                <button
                  onClick={handlePlaceBet}
                  disabled={!selectedOption || wager <= 0 || wager > coins}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95"
                >
                  Bet!
                </button>
              </div>

              {selectedOdds && wager > 0 && (
                <p className="text-white/25 text-[10px] mt-1.5 text-center">
                  Win: <span className="text-amber-400/80 font-bold">{Math.floor(wager * selectedOdds)}</span> coins
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
