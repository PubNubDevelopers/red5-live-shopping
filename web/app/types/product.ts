export interface Product {
  id: string
  name: string
  price: string
  currency: string
  images: string[]
  description: string
  specifications: { label: string; value: string }[]
  conditionSummary: string
  includedAccessories: string[]
  callToAction: {
    text: string
    link: string
  }
  startTimeMs?: number
  endTimeMs?: number
}

// Per-product theme colors for UI accents (bag messages, highlights, etc.)
export const productColors: Record<string, { bg: string; text: string; emoji: string }> = {
  TUMBLER01: { bg: 'bg-[#0E7490]', text: 'text-[#67E8F9]', emoji: '⚽' },   // Teal tumbler
  MEAL01:    { bg: 'bg-[#B45309]', text: 'text-[#FCD34D]', emoji: '🍔' },    // Victory meal
  SHOES01:   { bg: 'bg-[#9B1B1B]', text: 'text-[#FF6B6B]', emoji: '👟' },    // Sport trainers
  SCREEN01:  { bg: 'bg-[#6B21A8]', text: 'text-[#C084FC]', emoji: '📺' },    // 4K screen
}

export const defaultProductColor = { bg: 'bg-[#4A3580]', text: 'text-[#B794F4]', emoji: '🛍️' }

export interface ProductHighlightMessage {
  type: 'PRODUCT_HIGHLIGHT'
  product: Product
}

export interface ProductDismissMessage {
  type: 'PRODUCT_DISMISS'
}

export type ProductMessage = ProductHighlightMessage | ProductDismissMessage
