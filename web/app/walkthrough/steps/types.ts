export type WalkthroughMode = 'pubnub' | 'red5'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface WalkthroughStep {
  id: string
  targetSelector: string
  title: string
  body: string
  placement: TooltipPlacement
  mode: WalkthroughMode
  spotlightPadding?: number
  prepareUI?: string
  order: number
}
