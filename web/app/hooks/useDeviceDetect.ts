'use client'

import { useState, useEffect } from 'react'

interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLandscape: boolean
  isTouchDevice: boolean
}

export function useDeviceDetect(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLandscape: true,
    isTouchDevice: false,
  })

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth
      const isTouchDevice =
        'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isLandscape = window.innerWidth > window.innerHeight

      setDevice({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLandscape,
        isTouchDevice,
      })
    }

    update()

    let timeoutId: ReturnType<typeof setTimeout>
    const debouncedUpdate = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(update, 150)
    }

    window.addEventListener('resize', debouncedUpdate)
    window.addEventListener('orientationchange', update)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', debouncedUpdate)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return device
}
