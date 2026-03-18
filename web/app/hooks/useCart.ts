'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Chat } from '@pubnub/chat'
import type { Product } from '../types/product'

export interface CartItem {
  productId: string
  name: string
  price: string
  currency: string
  image: string
  quantity: number
}

export function useCart(chat: Chat | null) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  // Load cart from PubNub App Context (user custom metadata)
  useEffect(() => {
    if (!chat) return
    async function loadCart() {
      try {
        const user = await chat!.getUser(chat!.currentUser.id)
        if (user?.custom?.cart) {
          const parsed = JSON.parse(user.custom.cart as string)
          if (Array.isArray(parsed)) {
            setItems(parsed)
          }
        }
      } catch (err) {
        console.warn('[useCart] Failed to load cart:', err)
      }
      setLoading(false)
    }
    loadCart()
  }, [chat])

  // Persist cart to PubNub App Context
  const persistCart = useCallback(async (newItems: CartItem[]) => {
    if (!chat) return
    try {
      await chat.currentUser.update({
        custom: {
          ...((chat.currentUser as any).custom || {}),
          cart: JSON.stringify(newItems),
        },
      })
    } catch (err) {
      console.warn('[useCart] Failed to persist cart:', err)
    }
  }, [chat])

  const addItem = useCallback(async (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id)
      let updated: CartItem[]
      if (existing) {
        updated = prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      } else {
        updated = [...prev, {
          productId: product.id,
          name: product.name,
          price: product.price,
          currency: product.currency,
          image: product.images[0],
          quantity: 1,
        }]
      }
      persistCart(updated)
      return updated
    })
  }, [persistCart])

  const removeItem = useCallback(async (productId: string) => {
    setItems(prev => {
      const updated = prev.filter(i => i.productId !== productId)
      persistCart(updated)
      return updated
    })
  }, [persistCart])

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems(prev => {
      const updated = prev.map(i =>
        i.productId === productId ? { ...i, quantity } : i
      )
      persistCart(updated)
      return updated
    })
  }, [persistCart, removeItem])

  const clearCart = useCallback(async () => {
    setItems([])
    persistCart([])
  }, [persistCart])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce(
    (sum, i) => sum + parseFloat(i.price) * i.quantity,
    0
  )

  return {
    items,
    loading,
    totalItems,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  }
}
