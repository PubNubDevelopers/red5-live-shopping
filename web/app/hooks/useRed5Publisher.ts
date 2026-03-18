'use client'

import { useCallback, useRef, useState } from 'react'
import { getRed5StreamConfig } from '../config/red5Config'

interface PublisherState {
  isPublishing: boolean
  isMicOn: boolean
  isCameraOn: boolean
  error: string | null
}

export function useRed5Publisher(streamName: string, isMobile: boolean = false) {
  const publisherRef = useRef<any>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const facingModeRef = useRef<'user' | 'environment'>('user')

  const [state, setState] = useState<PublisherState>({
    isPublishing: false,
    isMicOn: true,
    isCameraOn: true,
    error: null,
  })

  const startPublishing = useCallback(async () => {
    if (!videoRef.current) {
      console.warn('[useRed5Publisher] No video element ref')
      return
    }
    setState(prev => ({ ...prev, error: null }))

    try {
      const config = getRed5StreamConfig(streamName, isMobile)
      if (!config.host) {
        setState(prev => ({
          ...prev,
          error: 'Red5 host not configured. Set NEXT_PUBLIC_RED5_HOST in .env',
        }))
        return
      }

      console.log('[useRed5Publisher] Connecting to', config.whipEndpoint)

      const red5prosdk = await import('red5pro-webrtc-sdk')

      const elementId = videoRef.current.id || 'red5pro-publisher'
      if (!videoRef.current.id) {
        videoRef.current.id = elementId
      }

      const publisher = new red5prosdk.WHIPClient()
      await publisher.init({
        endpoint: config.whipEndpoint,
        host: config.host,
        app: config.app,
        streamName,
        mediaElementId: elementId,
        rtcConfiguration: { iceServers: config.iceServers },
        mediaConstraints: config.mediaConstraints,
        bandwidth: config.bandwidth,
      })

      await publisher.publish(streamName)
      publisherRef.current = publisher

      const stream = publisher.getMediaStream()
      if (stream) {
        mediaStreamRef.current = stream
        cameraStreamRef.current = stream
        videoRef.current.srcObject = stream
      }

      setState({ isPublishing: true, isMicOn: true, isCameraOn: true, error: null })
      console.log('[useRed5Publisher] Publishing started for', streamName)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start stream'
      setState(prev => ({ ...prev, error: message }))
      console.error('[useRed5Publisher] Publish failed:', err)
    }
  }, [streamName, isMobile])

  const stopPublishing = useCallback(async () => {
    try {
      if (publisherRef.current) {
        await publisherRef.current.unpublish()
      }
    } catch (err) {
      console.warn('[useRed5Publisher] Unpublish error:', err)
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    publisherRef.current = null
    setState({ isPublishing: false, isMicOn: true, isCameraOn: true, error: null })
    console.log('[useRed5Publisher] Publishing stopped')
  }, [])

  const toggleMic = useCallback(() => {
    if (mediaStreamRef.current) {
      const enabled = !state.isMicOn
      mediaStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = enabled
      })
      setState(prev => ({ ...prev, isMicOn: enabled }))
    }
  }, [state.isMicOn])

  const toggleCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      const enabled = !state.isCameraOn
      mediaStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = enabled
      })
      setState(prev => ({ ...prev, isCameraOn: enabled }))
    }
  }, [state.isCameraOn])

  const switchCamera = useCallback(async () => {
    try {
      facingModeRef.current =
        facingModeRef.current === 'user' ? 'environment' : 'user'
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingModeRef.current },
          width: { ideal: isMobile ? 720 : 1280 },
          height: { ideal: isMobile ? 1280 : 720 },
          frameRate: { ideal: 30 },
        },
      })

      if (!mediaStreamRef.current) return
      const newTrack = newStream.getVideoTracks()[0]
      if (!newTrack) return

      const oldTrack = mediaStreamRef.current.getVideoTracks()[0]
      if (oldTrack) {
        mediaStreamRef.current.removeTrack(oldTrack)
        oldTrack.stop()
      }
      mediaStreamRef.current.addTrack(newTrack)

      const pc = publisherRef.current?.getPeerConnection()
      if (pc) {
        const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(newTrack)
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current
      }

      cameraStreamRef.current = newStream
      console.log('[useRed5Publisher] Switched camera to', facingModeRef.current)
    } catch (err) {
      console.warn('[useRed5Publisher] Switch camera failed:', err)
      setState(prev => ({ ...prev, error: 'Could not switch camera' }))
    }
  }, [isMobile])

  return {
    videoRef,
    ...state,
    startPublishing,
    stopPublishing,
    toggleMic,
    toggleCamera,
    switchCamera,
  }
}
