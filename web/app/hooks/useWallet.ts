'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Chat } from '@pubnub/chat'
import { STARTING_COINS } from '../data/constants'

export function useWallet(chat: Chat | null) {
  const [coins, setCoins] = useState(STARTING_COINS)
  const [loading, setLoading] = useState(true)
  const [bouncing, setBouncing] = useState(false)

  useEffect(() => {
    if (!chat) return
    async function loadWallet() {
      try {
        const user = await chat!.getUser(chat!.currentUser.id)
        if (user?.custom?.coins !== undefined) {
          setCoins(Number(user.custom.coins))
        } else {
          await chat!.currentUser.update({
            custom: {
              ...((chat!.currentUser as any).custom || {}),
              coins: STARTING_COINS,
            },
          })
        }
      } catch (err) {
        console.warn('[useWallet] Failed to load wallet:', err)
      }
      setLoading(false)
    }
    loadWallet()
  }, [chat])

  const persistCoins = useCallback(async (newCoins: number) => {
    if (!chat) return
    try {
      await chat.currentUser.update({
        custom: {
          ...((chat.currentUser as any).custom || {}),
          coins: newCoins,
        },
      })
    } catch (err) {
      console.warn('[useWallet] Failed to persist coins:', err)
    }
  }, [chat])

  const triggerBounce = useCallback(() => {
    setBouncing(true)
    setTimeout(() => setBouncing(false), 500)
  }, [])

  const addCoins = useCallback((amount: number) => {
    setCoins(prev => {
      const updated = prev + amount
      persistCoins(updated)
      triggerBounce()
      return updated
    })
  }, [persistCoins, triggerBounce])

  const removeCoins = useCallback((amount: number) => {
    setCoins(prev => {
      const updated = Math.max(0, prev - amount)
      persistCoins(updated)
      triggerBounce()
      return updated
    })
  }, [persistCoins, triggerBounce])

  const canAfford = useCallback((amount: number) => {
    return coins >= amount
  }, [coins])

  return {
    coins,
    loading,
    bouncing,
    addCoins,
    removeCoins,
    canAfford,
  }
}
