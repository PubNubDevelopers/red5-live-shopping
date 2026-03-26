'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useWalkthrough } from './WalkthroughProvider'
import WalkthroughTooltip from './WalkthroughTooltip'

function computeTooltipPosition(
  rect: DOMRect | null,
  placement: string,
  tooltipWidth: number,
  tooltipHeight: number,
): { top: number; left: number } {
  const padding = 16
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (!rect || placement === 'center') {
    return {
      top: Math.max(padding, (vh - tooltipHeight) / 2),
      left: Math.max(padding, (vw - tooltipWidth) / 2),
    }
  }

  let top = 0
  let left = 0

  switch (placement) {
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.right + padding
      break
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.left - tooltipWidth - padding
      break
    case 'bottom':
      top = rect.bottom + padding
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      break
    case 'top':
      top = rect.top - tooltipHeight - padding
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      break
  }

  if (left + tooltipWidth > vw - padding) left = vw - tooltipWidth - padding
  if (left < padding) left = padding
  if (top + tooltipHeight > vh - padding) top = vh - tooltipHeight - padding
  if (top < padding) top = padding

  // Overlap fallback: push tooltip below target
  if (rect) {
    const tR = { top, left, right: left + tooltipWidth, bottom: top + tooltipHeight }
    const overlap =
      tR.left < rect.right && tR.right > rect.left &&
      tR.top < rect.bottom && tR.bottom > rect.top

    if (overlap && placement !== 'bottom') {
      top = rect.bottom + padding
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      if (left + tooltipWidth > vw - padding) left = vw - tooltipWidth - padding
      if (left < padding) left = padding
      if (top + tooltipHeight > vh - padding) top = vh - tooltipHeight - padding
      if (top < padding) top = padding
    }
  }

  return { top, left }
}

export default function WalkthroughOverlay() {
  const {
    isActive,
    mode,
    currentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    setTargetRect,
    nextStep,
    prevStep,
    endTour,
    switchMode,
  } = useWalkthrough()

  const tooltipRef = useRef<HTMLDivElement>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tooltipSize, setTooltipSize] = useState({ w: 400, h: 300 })

  const findTarget = useCallback(() => {
    if (!currentStep || !currentStep.targetSelector) {
      setTargetRect(null)
      return
    }

    const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        const pad = currentStep.spotlightPadding ?? 8
        setTargetRect(new DOMRect(
          rect.x - pad,
          rect.y - pad,
          rect.width + pad * 2,
          rect.height + pad * 2,
        ))
        retryCountRef.current = 0

        const inViewport =
          rect.top >= 0 && rect.left >= 0 &&
          rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
        if (!inViewport) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
        return
      }
    }

    // Retry up to 8 times for elements that may not be rendered yet
    if (retryCountRef.current < 8) {
      retryCountRef.current++
      const delay = retryCountRef.current <= 3 ? 400 : 600
      retryTimerRef.current = setTimeout(findTarget, delay)
    } else {
      setTargetRect(null)
      retryCountRef.current = 0
    }
  }, [currentStep, setTargetRect])

  useEffect(() => {
    if (!isActive || !currentStep) return
    retryCountRef.current = 0
    const timer = setTimeout(findTarget, 200)
    return () => {
      clearTimeout(timer)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [isActive, currentStep, findTarget])

  useEffect(() => {
    if (!isActive) return
    const handleResize = () => findTarget()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isActive, findTarget])

  // Measure tooltip once per step change
  useEffect(() => {
    if (!tooltipRef.current) return
    const timer = setTimeout(() => {
      if (tooltipRef.current) {
        const { offsetWidth, offsetHeight } = tooltipRef.current
        if (offsetWidth > 0 && offsetHeight > 0) {
          setTooltipSize(prev =>
            prev.w === offsetWidth && prev.h === offsetHeight
              ? prev
              : { w: offsetWidth, h: offsetHeight }
          )
        }
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [currentStepIndex, isActive])

  useEffect(() => {
    if (!isActive) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep()
      else if (e.key === 'ArrowLeft') prevStep()
      else if (e.key === 'Escape') endTour()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isActive, nextStep, prevStep, endTour])

  if (!isActive || !currentStep || !mode) return null

  const hasTarget = !!targetRect

  const clipPath = hasTarget
    ? `polygon(
        0% 0%, 0% 100%,
        ${targetRect!.left}px 100%,
        ${targetRect!.left}px ${targetRect!.top}px,
        ${targetRect!.right}px ${targetRect!.top}px,
        ${targetRect!.right}px ${targetRect!.bottom}px,
        ${targetRect!.left}px ${targetRect!.bottom}px,
        ${targetRect!.left}px 100%,
        100% 100%, 100% 0%
      )`
    : undefined

  const tooltipPos = computeTooltipPosition(
    targetRect,
    currentStep.placement,
    tooltipSize.w,
    tooltipSize.h,
  )

  const handleSwitchMode = () => {
    switchMode(mode === 'pubnub' ? 'red5' : 'pubnub')
  }

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Backdrop with spotlight cutout */}
      {hasTarget && (
        <div
          onClick={endTour}
          className="absolute inset-0 bg-black/45 pointer-events-auto cursor-default transition-[clip-path] duration-350 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ clipPath }}
        />
      )}

      {/* Light scrim when no target */}
      {!hasTarget && (
        <div
          onClick={endTour}
          className="absolute inset-0 bg-black/25 pointer-events-auto cursor-default"
        />
      )}

      {/* Spotlight border glow */}
      {hasTarget && (
        <div
          className="absolute rounded-lg border-2 pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            left: targetRect!.left,
            top: targetRect!.top,
            width: targetRect!.width,
            height: targetRect!.height,
            borderColor: mode === 'pubnub' ? 'rgba(229,56,59,0.5)' : 'rgba(239,68,68,0.5)',
            boxShadow: mode === 'pubnub'
              ? '0 0 20px rgba(229,56,59,0.2), inset 0 0 20px rgba(229,56,59,0.05)'
              : '0 0 20px rgba(239,68,68,0.2), inset 0 0 20px rgba(239,68,68,0.05)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-auto z-[9999] transition-[top,left] duration-350 ease-out"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <WalkthroughTooltip
          title={currentStep.title}
          body={currentStep.body}
          mode={mode}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onEnd={endTour}
          onSwitchMode={handleSwitchMode}
          isFirst={currentStepIndex === 0}
          isLast={currentStepIndex === totalSteps - 1}
        />
      </div>
    </div>
  )
}
