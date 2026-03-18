'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const STATUS_CHANNEL = 'game.stream-status'
const SIGNAL_CHANNEL = 'game.stream-signal'
const LIVE_DURATION_SECONDS = 60
const HEARTBEAT_MS = 5_000
const WATCHDOG_MS = 12_000

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export type LiveMode = 'idle' | 'publishing' | 'watching'

export function useLiveCamera(sdk: any, userId: string) {
  const [mode, setMode] = useState<LiveMode>('idle')
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remoteActive, setRemoteActive] = useState(false)
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(LIVE_DURATION_SECONDS)
  const [isMicOn, setIsMicOn] = useState(true)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const modeRef = useRef<LiveMode>('idle')
  const timeLeftRef = useRef(LIVE_DURATION_SECONDS)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pubCandidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const subCandidateQueue = useRef<RTCIceCandidateInit[]>([])
  const subRemoteDescSet = useRef(false)
  const facingModeRef = useRef<'user' | 'environment'>('user')
  const stopLiveRef = useRef<() => void>(() => {})

  useEffect(() => { modeRef.current = mode }, [mode])

  function clearWatchdog() {
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null }
  }

  function cleanupSubscriber() {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
    remoteStreamRef.current = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setIsConnected(false)
    setIsConnecting(false)
    subCandidateQueue.current = []
    subRemoteDescSet.current = false
  }

  function cleanupPublisher() {
    peersRef.current.forEach(pc => pc.close())
    peersRef.current.clear()
    pubCandidateQueues.current.clear()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null }
  }

  // PubNub subscriptions — sdk and userId are stable for the session
  useEffect(() => {
    if (!sdk) return

    function resetWatchdog() {
      clearWatchdog()
      watchdogRef.current = setTimeout(() => {
        setRemoteActive(false)
        setRemoteUserId(null)
        if (modeRef.current === 'watching') {
          cleanupSubscriber()
          setMode('idle')
        }
      }, WATCHDOG_MS)
    }

    async function handleJoin(subscriberId: string) {
      if (!localStreamRef.current) return

      const old = peersRef.current.get(subscriberId)
      if (old) old.close()

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      peersRef.current.set(subscriberId, pc)
      pubCandidateQueues.current.set(subscriberId, [])

      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })

      pc.onicecandidate = e => {
        if (e.candidate) {
          sdk.publish({ channel: SIGNAL_CHANNEL, message: {
            type: 'ICE_CANDIDATE', candidate: e.candidate.toJSON(),
            targetUserId: subscriberId, publisherId: userId,
          }})
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          pc.close()
          peersRef.current.delete(subscriberId)
          pubCandidateQueues.current.delete(subscriberId)
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      sdk.publish({ channel: SIGNAL_CHANNEL, message: {
        type: 'OFFER', sdp: { type: offer.type, sdp: offer.sdp },
        targetUserId: subscriberId, publisherId: userId,
      }})
    }

    async function handleOffer(msg: any) {
      if (pcRef.current) pcRef.current.close()

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc
      subRemoteDescSet.current = false
      subCandidateQueue.current = []

      pc.ontrack = event => {
        if (event.streams[0]) {
          remoteStreamRef.current = event.streams[0]
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0]
          }
          setIsConnected(true)
          setIsConnecting(false)
        }
      }

      pc.onicecandidate = e => {
        if (e.candidate) {
          sdk.publish({ channel: SIGNAL_CHANNEL, message: {
            type: 'ICE_CANDIDATE', candidate: e.candidate.toJSON(),
            targetUserId: msg.publisherId, subscriberId: userId,
          }})
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsConnected(true)
          setIsConnecting(false)
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsConnected(false)
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
      subRemoteDescSet.current = true

      for (const c of subCandidateQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c))
      }
      subCandidateQueue.current = []

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      sdk.publish({ channel: SIGNAL_CHANNEL, message: {
        type: 'ANSWER', sdp: { type: answer.type, sdp: answer.sdp },
        targetUserId: msg.publisherId, subscriberId: userId,
      }})
    }

    const statusCh = sdk.channel(STATUS_CHANNEL)
    const statusSub = statusCh.subscription()
    statusSub.onMessage = (evt: any) => {
      const msg = evt.message
      if (!msg || msg.userId === userId) return

      if (msg.type === 'STREAM_STARTED' || msg.type === 'STREAM_HEARTBEAT') {
        setRemoteActive(true)
        setRemoteUserId(msg.userId)
        if (msg.timeRemaining !== undefined) setTimeLeft(msg.timeRemaining)
        resetWatchdog()

        if (modeRef.current === 'idle') {
          setMode('watching')
          setIsConnecting(true)
          sdk.publish({ channel: SIGNAL_CHANNEL, message: {
            type: 'JOIN', subscriberId: userId, targetUserId: msg.userId,
          }})
        }
      } else if (msg.type === 'STREAM_STOPPED') {
        clearWatchdog()
        setRemoteActive(false)
        setRemoteUserId(null)
        setTimeLeft(LIVE_DURATION_SECONDS)
        if (modeRef.current === 'watching') {
          cleanupSubscriber()
          setMode('idle')
        }
      }
    }
    statusSub.subscribe()

    const signalCh = sdk.channel(SIGNAL_CHANNEL)
    const signalSub = signalCh.subscription()
    signalSub.onMessage = async (evt: any) => {
      const msg = evt.message
      if (!msg || msg.targetUserId !== userId) return

      try {
        switch (msg.type) {
          case 'JOIN':
            if (modeRef.current === 'publishing') await handleJoin(msg.subscriberId)
            break

          case 'OFFER':
            if (modeRef.current === 'watching') await handleOffer(msg)
            break

          case 'ANSWER': {
            if (modeRef.current !== 'publishing') break
            const pc = peersRef.current.get(msg.subscriberId)
            if (!pc) break
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            const q = pubCandidateQueues.current.get(msg.subscriberId) || []
            for (const c of q) await pc.addIceCandidate(new RTCIceCandidate(c))
            pubCandidateQueues.current.set(msg.subscriberId, [])
            break
          }

          case 'ICE_CANDIDATE':
            if (modeRef.current === 'publishing') {
              const pc = peersRef.current.get(msg.subscriberId)
              if (!pc) break
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
              } else {
                const q = pubCandidateQueues.current.get(msg.subscriberId) || []
                q.push(msg.candidate)
                pubCandidateQueues.current.set(msg.subscriberId, q)
              }
            } else if (modeRef.current === 'watching' && pcRef.current) {
              if (subRemoteDescSet.current) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate))
              } else {
                subCandidateQueue.current.push(msg.candidate)
              }
            }
            break
        }
      } catch (err) {
        console.error('[LiveCamera] signaling error:', err)
      }
    }
    signalSub.subscribe()

    return () => {
      statusSub.unsubscribe()
      signalSub.unsubscribe()
      clearWatchdog()
    }
  }, [sdk, userId])

  // Attach remote stream when the video element mounts
  useEffect(() => {
    if (mode === 'watching' && remoteStreamRef.current && remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
      setIsConnected(true)
      setIsConnecting(false)
    }
  }, [mode, isConnected])

  // Attach local camera when switching to publishing
  useEffect(() => {
    if (mode === 'publishing' && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
      localVideoRef.current.play().catch(() => {})
    }
  }, [mode])

  const goLive = useCallback(async () => {
    if (modeRef.current !== 'idle') return
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 960 }, facingMode: 'user' },
        audio: true,
      })
      localStreamRef.current = stream
      facingModeRef.current = 'user'
      timeLeftRef.current = LIVE_DURATION_SECONDS
      setTimeLeft(LIVE_DURATION_SECONDS)
      setMode('publishing')

      sdk.publish({ channel: STATUS_CHANNEL, message: {
        type: 'STREAM_STARTED', userId, timeRemaining: LIVE_DURATION_SECONDS, ts: Date.now(),
      }})

      countdownRef.current = setInterval(() => {
        timeLeftRef.current -= 1
        setTimeLeft(timeLeftRef.current)
        if (timeLeftRef.current <= 0) stopLiveRef.current()
      }, 1000)

      heartbeatRef.current = setInterval(() => {
        sdk.publish({ channel: STATUS_CHANNEL, message: {
          type: 'STREAM_HEARTBEAT', userId, timeRemaining: timeLeftRef.current, ts: Date.now(),
        }})
      }, HEARTBEAT_MS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access failed')
    }
  }, [sdk, userId])

  const stopLive = useCallback(() => {
    cleanupPublisher()
    setMode('idle')
    setIsMicOn(true)
    setTimeLeft(LIVE_DURATION_SECONDS)
    sdk?.publish({ channel: STATUS_CHANNEL, message: {
      type: 'STREAM_STOPPED', userId, ts: Date.now(),
    }})
  }, [sdk, userId])

  useEffect(() => { stopLiveRef.current = stopLive }, [stopLive])

  const watchStream = useCallback(() => {
    if (!remoteUserId || modeRef.current !== 'idle') return
    setMode('watching')
    setIsConnecting(true)
    sdk.publish({ channel: SIGNAL_CHANNEL, message: {
      type: 'JOIN', subscriberId: userId, targetUserId: remoteUserId,
    }})
  }, [sdk, userId, remoteUserId])

  const stopWatching = useCallback(() => {
    cleanupSubscriber()
    setRemoteActive(false)
    setRemoteUserId(null)
    setMode('idle')
  }, [])

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const on = !isMicOn
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = on })
      setIsMicOn(on)
    }
  }, [isMicOn])

  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current) return
    try {
      const newFacing = facingModeRef.current === 'user' ? 'environment' : 'user'
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: newFacing }, width: { ideal: 640 }, height: { ideal: 960 } },
      })

      const newTrack = newStream.getVideoTracks()[0]
      if (!newTrack) return

      const oldTrack = localStreamRef.current.getVideoTracks()[0]
      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack)
        oldTrack.stop()
      }
      localStreamRef.current.addTrack(newTrack)

      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(newTrack)
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
      facingModeRef.current = newFacing
    } catch (err) {
      console.warn('[LiveCamera] switchCamera failed:', err)
    }
  }, [])

  useEffect(() => {
    const onUnload = () => {
      if (modeRef.current === 'publishing') {
        sdk?.publish({ channel: STATUS_CHANNEL, message: {
          type: 'STREAM_STOPPED', userId, ts: Date.now(),
        }})
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      cleanupPublisher()
      cleanupSubscriber()
      clearWatchdog()
    }
  }, [sdk, userId])

  return {
    mode, isConnected, isConnecting, error,
    remoteActive, remoteUserId, timeLeft, isMicOn,
    localVideoRef, remoteVideoRef,
    goLive, stopLive, watchStream, stopWatching,
    toggleMic, switchCamera,
    LIVE_DURATION_SECONDS,
  }
}
