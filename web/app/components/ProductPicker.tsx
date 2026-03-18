'use client'

import { useState } from 'react'
import type { Product } from '../types/product'
import type { CartItem } from '../hooks/useCart'
import { productColors, defaultProductColor } from '../types/product'

interface ProductPickerProps {
  products: Product[]
  activeProductId: string | null
  onHighlight: (product: Product) => void
  onDismiss: () => void
  onClose: () => void
  isHost?: boolean
  cartItems?: CartItem[]
  onAddToBag?: (product: Product) => void
}

export default function ProductPicker({
  products,
  activeProductId,
  onHighlight,
  onDismiss,
  onClose,
  isHost = false,
  cartItems = [],
  onAddToBag,
}: ProductPickerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)

  function getCartQuantity(productId: string) {
    const item = cartItems.find(i => i.productId === productId)
    return item?.quantity ?? 0
  }

  function handleAdd(product: Product) {
    if (!onAddToBag) return
    onAddToBag(product)
    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 1200)
  }

  return (
    <div
      className="absolute inset-0 z-40 flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" />

      {/* Side panel */}
      <div
        className="relative h-full w-80 max-w-[85vw] bg-gradient-to-b from-[#1a1a1a] to-[#111] border-l border-white/5 flex flex-col animate-slide-right-in shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-white/5" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 1.5rem))' }}>
          <div>
            <h2 className="text-white text-lg font-bold tracking-tight">Shop</h2>
            <p className="text-white/40 text-xs mt-0.5">{products.length} items available</p>
          </div>
          <div className="flex items-center gap-2">
            {activeProductId && isHost && (
              <button
                className="text-white/60 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={onDismiss}
              >
                Hide
              </button>
            )}
            <button
              className="text-white/30 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              onClick={onClose}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-3 safe-area-bottom space-y-3">
          {products.map(product => {
            const isActive = product.id === activeProductId
            const isExpanded = expandedId === product.id
            const qty = getCartQuantity(product.id)
            const pColor = productColors[product.id] || defaultProductColor
            const justAdded = addedId === product.id

            return (
              <div
                key={product.id}
                className={`w-full text-left rounded-2xl transition-all overflow-hidden ${
                  isActive
                    ? 'ring-1 ring-white/20 bg-white/[0.04]'
                    : 'bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                {/* Clickable image area */}
                <div
                  className="w-full aspect-[16/10] rounded-t-2xl bg-black/40 overflow-hidden cursor-pointer relative"
                  onClick={() => setExpandedId(isExpanded ? null : product.id)}
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                  {isActive && isHost && (
                    <span className="absolute top-2 left-2 text-[10px] text-white font-semibold uppercase tracking-wider bg-red-500/90 px-2 py-0.5 rounded-full">
                      Live
                    </span>
                  )}
                  {qty > 0 && (
                    <span className="absolute top-2 right-2 min-w-[20px] h-[20px] bg-white/90 text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {qty}
                    </span>
                  )}
                </div>

                {/* Info + action row */}
                <div className="px-3.5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-sm font-medium leading-snug line-clamp-1">
                        {product.name}
                      </p>
                      <p className={`${pColor.text} text-base font-bold mt-0.5`}>
                        ${product.price}
                      </p>
                    </div>

                    {/* Add to bag button */}
                    {onAddToBag && (
                      <button
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-90 ${
                          justAdded
                            ? 'bg-green-500 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                        }`}
                        onClick={e => {
                          e.stopPropagation()
                          handleAdd(product)
                        }}
                      >
                        {justAdded ? (
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Host highlight button */}
                  {isHost && (
                    <button
                      className={`mt-2 w-full py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-white/10 text-white/50'
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                      }`}
                      onClick={() => onHighlight(product)}
                    >
                      {isActive ? 'Currently showing' : 'Show to viewers'}
                    </button>
                  )}
                </div>

                {/* Expandable detail section */}
                {isExpanded && (
                  <div className="px-3.5 pb-4 space-y-3 border-t border-white/5 pt-3 animate-fade-in-up">
                    <p className="text-white/50 text-xs leading-relaxed">
                      {product.description}
                    </p>

                    {/* Specs */}
                    <div className="space-y-1.5">
                      {product.specifications.map(spec => (
                        <div
                          key={spec.label}
                          className="flex justify-between text-xs"
                        >
                          <span className="text-white/30">{spec.label}</span>
                          <span className="text-white/70 text-right ml-3">{spec.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Condition */}
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold mb-1">Condition</p>
                      <p className="text-white/50 text-xs leading-relaxed">{product.conditionSummary}</p>
                    </div>

                    {/* Accessories */}
                    {product.includedAccessories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {product.includedAccessories.map((acc, i) => (
                          <span
                            key={i}
                            className="text-white/60 text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full"
                          >
                            {acc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
