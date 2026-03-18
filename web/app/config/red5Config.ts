export interface Red5StreamConfig {
  host: string
  nodeGroup: string
  streamName: string
  app: string
  iceServers: RTCIceServer[]
  bandwidth: { audio: number; video: number }
  mediaConstraints: MediaStreamConstraints
  whipEndpoint: string
  whepEndpoint: string
}

export const getRed5StreamConfig = (
  streamName: string,
  isMobile: boolean = false
): Red5StreamConfig => {
  const host = process.env.NEXT_PUBLIC_RED5_HOST || ''
  const nodeGroup = process.env.NEXT_PUBLIC_RED5_NODE_GROUP || ''
  const app = process.env.NEXT_PUBLIC_RED5_APP || 'live'

  const turnUrl = process.env.NEXT_PUBLIC_TURN_SERVER_URL || 'stun:stun2.l.google.com:19302'

  const baseWhip = `https://${host}/as/v1/proxy/whip/${app}/${streamName}`
  const baseWhep = `https://${host}/as/v1/proxy/whep/${app}/${streamName}`
  const qs = nodeGroup ? `?nodeGroup=${nodeGroup}` : ''

  return {
    host,
    nodeGroup,
    app,
    streamName,
    whipEndpoint: `${baseWhip}${qs}`,
    whepEndpoint: `${baseWhep}${qs}`,
    iceServers: [
      { urls: turnUrl },
    ],
    bandwidth: {
      audio: 56,
      video: 2000,
    },
    mediaConstraints: {
      audio: true,
      video: isMobile
        ? {
            width: { ideal: 720 },
            height: { ideal: 1280 },
            frameRate: { ideal: 30 },
            facingMode: 'user',
          }
        : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
    },
  }
}
