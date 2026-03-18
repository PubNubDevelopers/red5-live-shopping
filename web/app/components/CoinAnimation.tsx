'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CoinAnimationProps {
  type: 'win' | 'loss' | null
  amount: number
  onComplete: () => void
}

interface Coin {
  id: number
  x: number
  delay: number
  duration: number
  rotation: number
  size: number
}

export default function CoinAnimation({ type, amount, onComplete }: CoinAnimationProps) {
  const [coins, setCoins] = useState<Coin[]>([])
  const [showLabel, setShowLabel] = useState(false)

  const generateCoins = useCallback((count: number): Coin[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.5 + Math.random() * 1.5,
      rotation: Math.random() * 720 - 360,
      size: 20 + Math.random() * 16,
    }))
  }, [])

  useEffect(() => {
    if (!type) {
      setCoins([])
      setShowLabel(false)
      return
    }

    if (type === 'win') {
      setCoins(generateCoins(Math.min(30, Math.max(10, Math.floor(amount / 10)))))
    } else {
      setCoins(generateCoins(5))
    }

    setShowLabel(true)

    const timer = setTimeout(() => {
      setCoins([])
      setShowLabel(false)
      onComplete()
    }, 3000)

    return () => clearTimeout(timer)
  }, [type, amount])

  if (!type) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Coins */}
      <AnimatePresence>
        {coins.map(coin => (
          <motion.div
            key={coin.id}
            initial={
              type === 'win'
                ? { y: -60, x: `${coin.x}vw`, opacity: 0, scale: 0.5, rotate: 0 }
                : { y: '50vh', x: `${coin.x}vw`, opacity: 1, scale: 1, rotate: 0 }
            }
            animate={
              type === 'win'
                ? {
                    y: '110vh',
                    opacity: [0, 1, 1, 0],
                    scale: [0.5, 1, 1, 0.6],
                    rotate: coin.rotation,
                  }
                : {
                    y: '50vh',
                    opacity: [1, 0],
                    scale: [1, 2],
                    rotate: coin.rotation,
                  }
            }
            transition={{
              duration: type === 'win' ? coin.duration : 0.8,
              delay: coin.delay,
              ease: type === 'win' ? 'easeIn' : 'easeOut',
            }}
            className="absolute text-center"
            style={{ fontSize: coin.size }}
          >
            🪙
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Result label */}
      <AnimatePresence>
        {showLabel && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className={`px-8 py-4 rounded-2xl backdrop-blur-xl ${
              type === 'win'
                ? 'bg-green-500/20 border border-green-400/30'
                : 'bg-red-500/20 border border-red-400/30'
            }`}>
              <div className={`text-3xl font-black text-center ${
                type === 'win' ? 'text-green-400' : 'text-red-400'
              }`}>
                {type === 'win' ? 'YOU WON!' : 'LOST!'}
              </div>
              <div className={`text-lg font-bold text-center mt-1 ${
                type === 'win' ? 'text-amber-300' : 'text-red-300'
              }`}>
                {type === 'win' ? `+${amount}` : `-${amount}`} 🪙
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
