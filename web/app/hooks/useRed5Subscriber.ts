'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getRed5StreamConfig } from '../config/red5Config'

interface SubscriberState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  retryCount: number
  maxRetries: number
}

export function useRed5Subscriber(streamName: string) {
  const subscriberRef = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<SubscriberState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    retryCount: 0,
    maxRetries: 5,
  })

  const unsubscribe = useCallback(async () => {
    try {
      if (subscriberRef.current) {
        await subscriberRef.current.unsubscribe()
      }
    } catch (err) {
      console.warn('[useRed5Subscriber] Unsubscribe error:', err)
    }
    subscriberRef.current = null
    setState(prev => ({ ...prev, isConnected: false }))
  }, [])

  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const retryCountRef = useRef(0)
  const maxRetries = 5
  const retryDelayMs = 3000

  const subscribe = useCallback(async () => {
    if (!videoRef.current || !streamName) return
    if (subscriberRef.current) {
      await unsubscribe()
    }

    setState(prev => ({ ...prev, isConnected: false, isConnecting: true, error: null }))

    try {
      const config = getRed5StreamConfig(streamName)
      if (!config.host) {
        setState({
          isConnected: false,
          isConnecting: false,
          error: 'Red5 host not configured. Set NEXT_PUBLIC_RED5_HOST in .env',
          retryCount: 0,
          maxRetries,
        })
        return
      }

      console.log('[useRed5Subscriber] Connecting to', config.whepEndpoint)

      const red5prosdk = await import('red5pro-webrtc-sdk')

      const elementId = videoRef.current.id || 'red5pro-subscriber'
      if (!videoRef.current.id) {
        videoRef.current.id = elementId
      }

      const subscriber = new red5prosdk.WHEPClient()
      await subscriber.init({
        endpoint: config.whepEndpoint,
        host: config.host,
        app: config.app,
        streamName,
        mediaElementId: elementId,
        rtcConfiguration: { iceServers: config.iceServers },
      })

      await subscriber.subscribe()
      subscriberRef.current = subscriber
      retryCountRef.current = 0
      setState({ isConnected: true, isConnecting: false, error: null, retryCount: 0, maxRetries })
      console.log('[useRed5Subscriber] Subscribed to', streamName)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Subscribe failed'
      console.warn('[useRed5Subscriber] Subscribe failed, attempt', retryCountRef.current + 1, ':', message)
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++
        setState({
          isConnected: false,
          isConnecting: true,
          error: null,
          retryCount: retryCountRef.current,
          maxRetries,
        })
        retryTimeoutRef.current = setTimeout(() => {
          subscribe()
        }, retryDelayMs)
      } else {
        setState({
          isConnected: false,
          isConnecting: false,
          error: message,
          retryCount: retryCountRef.current,
          maxRetries,
        })
        console.warn('[useRed5Subscriber] All retries exhausted — stream not available')
      }
    }
  }, [streamName, unsubscribe])

  const retry = useCallback(async () => {
    retryCountRef.current = 0
    await subscribe()
  }, [subscribe])

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (subscriberRef.current) {
        subscriberRef.current.unsubscribe().catch(() => {})
        subscriberRef.current = null
      }
    }
  }, [streamName])

  return {
    videoRef,
    ...state,
    subscribe,
    unsubscribe,
    retry,
  }
}
