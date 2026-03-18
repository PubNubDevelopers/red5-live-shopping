'use client'

interface CoinWalletProps {
  coins: number
  bouncing: boolean
}

export default function CoinWallet({ coins, bouncing }: CoinWalletProps) {
  return (
    <div
      className={`flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3.5 py-2 border border-amber-400/20 ${
        bouncing ? 'animate-coin-bounce' : ''
      }`}
    >
      <span className="text-sm">🪙</span>
      <span className="text-amber-300 text-xs font-bold tabular-nums">
        {coins.toLocaleString()}
      </span>
    </div>
  )
}
