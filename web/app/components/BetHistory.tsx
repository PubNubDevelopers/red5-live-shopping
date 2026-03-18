'use client'

import type { PlacedBet } from '../types/bet'

interface BetHistoryProps {
  bets: PlacedBet[]
  totalWinnings: number
  totalLost: number
  coins: number
  onClose: () => void
  inline?: boolean
}

export default function BetHistory({ bets, totalWinnings, totalLost, coins, onClose, inline }: BetHistoryProps) {
  const netProfit = totalWinnings - totalLost

  const content = (
    <div
      className={`${
        inline
          ? 'h-full w-full'
          : 'relative h-full w-80 max-w-[85vw] border-l border-white/5 animate-slide-right-in shadow-2xl'
      } bg-gradient-to-b from-[#1a1a1a] to-[#111] flex flex-col`}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-4 border-b border-white/5" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 1.5rem))' }}>
        <div>
          <h2 className="text-white text-lg font-bold tracking-tight">Bet History</h2>
          <p className="text-white/40 text-xs mt-0.5">
            {bets.length} bet{bets.length !== 1 ? 's' : ''} placed
          </p>
        </div>
        {!inline && (
          <button
            className="text-white/30 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-white/5">
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider">Balance</div>
            <div className="text-amber-300 font-bold text-sm mt-0.5">🪙 {coins.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider">Won</div>
            <div className="text-green-400 font-bold text-sm mt-0.5">+{totalWinnings}</div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider">Lost</div>
            <div className="text-red-400 font-bold text-sm mt-0.5">-{totalLost}</div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider">Net</div>
            <div className={`font-bold text-sm mt-0.5 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netProfit >= 0 ? '+' : ''}{netProfit}
            </div>
          </div>
        </div>

        {/* Bet list */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-3 space-y-3">
          {bets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-4xl mb-3">🎰</span>
              <p className="text-white/30 text-sm">No bets placed yet</p>
              <p className="text-white/20 text-xs mt-1">Place a bet when the next one pops up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...bets].reverse().map((bet, i) => (
                <div
                  key={`${bet.betId}-${i}`}
                  className={`rounded-xl p-3 border ${
                    bet.result === 'win'
                      ? 'bg-green-500/5 border-green-500/20'
                      : bet.result === 'loss'
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-white/[0.03] border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-xs truncate">{bet.question}</p>
                      <p className="text-white font-semibold text-sm mt-0.5">
                        {bet.selectedLabel}
                        <span className="text-white/40 ml-1.5 text-xs">{bet.odds}x</span>
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      {bet.result === 'win' ? (
                        <div>
                          <div className="text-green-400 font-bold text-sm">+{bet.payout}</div>
                          <div className="text-green-400/50 text-xs">Won</div>
                        </div>
                      ) : bet.result === 'loss' ? (
                        <div>
                          <div className="text-red-400 font-bold text-sm">-{bet.wager}</div>
                          <div className="text-red-400/50 text-xs">Lost</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-amber-300 font-bold text-sm">{bet.wager}</div>
                          <div className="text-amber-300/50 text-xs">Pending</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swipe-back hint for inline mode */}
        {inline && bets.length === 0 && (
          <div className="pb-8 flex flex-col items-center gap-1 text-white/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-[10px]">Swipe to return</span>
          </div>
        )}
      </div>
    )

  if (inline) return content

  return (
    <div
      className="absolute inset-0 z-40 flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" />
      {content}
    </div>
  )
}
