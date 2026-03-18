'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Chat } from '@pubnub/chat'
import { betsChannelId, betResultsChannelId } from '../data/constants'
import type { BetProposal, BetResult, PlacedBet } from '../types/bet'

export function useBets(chat: Chat | null) {
  const [activeBet, setActiveBet] = useState<BetProposal | null>(null)
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([])
  const [lastResult, setLastResult] = useState<{
    result: BetResult
    bet: PlacedBet | null
  } | null>(null)
  const placedBetsRef = useRef(placedBets)
  placedBetsRef.current = placedBets

  useEffect(() => {
    if (!chat) return

    const betsCh = chat.sdk.channel(betsChannelId)
    const betsSub = betsCh.subscription()

    betsSub.onMessage = (messageEvent) => {
      const msg = messageEvent.message as any
      if (msg.type === 'BET_PROPOSAL') {
        setActiveBet(msg as BetProposal)
      }
    }

    const resultsCh = chat.sdk.channel(betResultsChannelId)
    const resultsSub = resultsCh.subscription()

    resultsSub.onMessage = (messageEvent) => {
      const msg = messageEvent.message as any
      if (msg.type === 'BET_RESULT') {
        const result = msg as BetResult
        setActiveBet(null)

        const matchingBet = placedBetsRef.current.find(
          b => b.betId === result.id && b.result === 'pending'
        )

        setPlacedBets(prev => {
          return prev.map(b => {
            if (b.betId === result.id && b.result === 'pending') {
              const won = b.selectedOptionId === result.winningOptionId
              return {
                ...b,
                result: (won ? 'win' : 'loss') as 'win' | 'loss',
                payout: won ? Math.floor(b.wager * b.odds) : 0,
              }
            }
            return b
          })
        })

        setLastResult({ result, bet: matchingBet || null })
      }
    }

    betsSub.subscribe()
    resultsSub.subscribe()

    return () => {
      betsSub.unsubscribe()
      resultsSub.unsubscribe()
    }
  }, [chat])

  const placeBet = useCallback(
    (proposal: BetProposal, selectedOptionId: string, wager: number) => {
      const option = proposal.options.find(o => o.id === selectedOptionId)
      if (!option) return

      const bet: PlacedBet = {
        betId: proposal.id,
        question: proposal.question,
        selectedOptionId,
        selectedLabel: option.label,
        odds: option.odds,
        wager,
        result: 'pending',
      }

      setPlacedBets(prev => [...prev, bet])
      setActiveBet(null)

      if (chat) {
        chat.sdk.publish({
          channel: betsChannelId,
          message: {
            type: 'BET_PLACED',
            userId: chat.currentUser.id,
            betId: proposal.id,
            selectedOptionId,
            wager,
          },
        })
      }
    },
    [chat]
  )

  const clearLastResult = useCallback(() => {
    setLastResult(null)
  }, [])

  const totalWinnings = placedBets
    .filter(b => b.result === 'win')
    .reduce((sum, b) => sum + (b.payout || 0), 0)

  const totalLost = placedBets
    .filter(b => b.result === 'loss')
    .reduce((sum, b) => sum + b.wager, 0)

  return {
    activeBet,
    placedBets,
    lastResult,
    placeBet,
    clearLastResult,
    totalWinnings,
    totalLost,
  }
}
