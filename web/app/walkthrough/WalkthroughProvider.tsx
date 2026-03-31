'use client'

import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from 'react'
import type { WalkthroughMode, WalkthroughStep } from './steps/types'
import { pubnubSteps } from './steps/pubnubSteps'
import { red5Steps } from './steps/red5Steps'

interface UICallbacks {
  showCart?: () => void
  showBetHistory?: () => void
}

interface WalkthroughContextValue {
  isActive: boolean
  mode: WalkthroughMode | null
  currentStepIndex: number
  currentStep: WalkthroughStep | null
  steps: WalkthroughStep[]
  totalSteps: number
  startTour: (mode: WalkthroughMode) => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  switchMode: (mode: WalkthroughMode) => void
  registerUICallbacks: (callbacks: UICallbacks) => void
  targetRect: DOMRect | null
  setTargetRect: (rect: DOMRect | null) => void
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null)

const SEEN_KEY = 'walkthrough-seen'

function getStepsForMode(mode: WalkthroughMode): WalkthroughStep[] {
  const steps = mode === 'pubnub' ? pubnubSteps : red5Steps
  return [...steps].sort((a, b) => a.order - b.order)
}

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<WalkthroughMode | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [steps, setSteps] = useState<WalkthroughStep[]>([])
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const uiCallbacksRef = useRef<UICallbacks>({})

  const registerUICallbacks = useCallback((callbacks: UICallbacks) => {
    uiCallbacksRef.current = { ...uiCallbacksRef.current, ...callbacks }
  }, [])

  const reportStepCompleted = useCallback((step: WalkthroughStep) => {
    if (typeof (window as any).actionCompleted === 'function') {
      (window as any).actionCompleted({
        action: step.title,
        blockDuplicateCalls: true,
        debug: false,
      })
    }
  }, [])

  const executeStepPrepare = useCallback((step: WalkthroughStep) => {
    if (!step.prepareUI) return
    const cb = uiCallbacksRef.current
    switch (step.prepareUI) {
      case 'showCart':
        cb.showCart?.()
        break
      case 'showBetHistory':
        cb.showBetHistory?.()
        break
    }
  }, [])

  const startTour = useCallback((tourMode: WalkthroughMode) => {
    const tourSteps = getStepsForMode(tourMode)
    setMode(tourMode)
    setSteps(tourSteps)
    setCurrentStepIndex(0)
    setTargetRect(null)
    setIsActive(true)

    if (tourSteps[0]) {
      setTimeout(() => executeStepPrepare(tourSteps[0]), 100)
      setTimeout(() => reportStepCompleted(tourSteps[0]), 150)
    }

    localStorage.setItem(SEEN_KEY, 'true')
  }, [executeStepPrepare, reportStepCompleted])

  const endTour = useCallback(() => {
    setIsActive(false)
    setMode(null)
    setCurrentStepIndex(0)
    setSteps([])
    setTargetRect(null)
  }, [])

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex >= steps.length) {
      endTour()
      return
    }
    setTargetRect(null)
    setCurrentStepIndex(nextIndex)
    setTimeout(() => executeStepPrepare(steps[nextIndex]), 100)
    setTimeout(() => reportStepCompleted(steps[nextIndex]), 150)
  }, [currentStepIndex, steps, endTour, executeStepPrepare, reportStepCompleted])

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex < 0) return
    setTargetRect(null)
    setCurrentStepIndex(prevIndex)
    setTimeout(() => executeStepPrepare(steps[prevIndex]), 100)
    setTimeout(() => reportStepCompleted(steps[prevIndex]), 150)
  }, [currentStepIndex, steps, executeStepPrepare, reportStepCompleted])

  const switchMode = useCallback((newMode: WalkthroughMode) => {
    const tourSteps = getStepsForMode(newMode)
    setMode(newMode)
    setSteps(tourSteps)
    setTargetRect(null)
    setCurrentStepIndex(0)
    if (tourSteps[0]) {
      setTimeout(() => executeStepPrepare(tourSteps[0]), 100)
      setTimeout(() => reportStepCompleted(tourSteps[0]), 150)
    }
  }, [executeStepPrepare, reportStepCompleted])

  const currentStep = steps[currentStepIndex] ?? null

  return (
    <WalkthroughContext.Provider
      value={{
        isActive,
        mode,
        currentStepIndex,
        currentStep,
        steps,
        totalSteps: steps.length,
        startTour,
        nextStep,
        prevStep,
        endTour,
        switchMode,
        registerUICallbacks,
        targetRect,
        setTargetRect,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  )
}

export function useWalkthrough(): WalkthroughContextValue {
  const ctx = useContext(WalkthroughContext)
  if (!ctx) throw new Error('useWalkthrough must be used within WalkthroughProvider')
  return ctx
}

export function hasSeenWalkthrough(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(SEEN_KEY) === 'true'
}
