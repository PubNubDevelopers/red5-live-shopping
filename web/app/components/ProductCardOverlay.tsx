'use client'

import { useState } from 'react'
import type { Product } from '../types/product'
import { productColors, defaultProductColor } from '../types/product'

interface ProductCardOverlayProps {
  product: Product
  onDismiss: () => void
  onAddToBag: (product: Product) => void
  horizontal?: boolean
}

export default function ProductCardOverlay({
  product,
  onDismiss,
  onAddToBag,
  horizontal,
}: ProductCardOverlayProps) {
  const [expanded, setExpanded] = useState(false)
  const [addedAnimation, setAddedAnimation] = useState(false)
  const pColor = productColors[product.id] || defaultProductColor

  function handleAddToBag() {
    setAddedAnimation(true)
    onAddToBag(product)
    setTimeout(() => setAddedAnimation(false), 1500)
  }

  return (
    <>
      {/* Expanded bottom sheet */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end"
          onClick={() => setExpanded(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-h-[75vh] bg-gradient-to-b from-[#1e1e1e] to-[#141414] rounded-t-3xl overflow-hidden shadow-2xl border-t border-white/10 animate-slide-up-in flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Close button */}
            <button
              className="absolute top-3 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-white/60 hover:text-white cursor-pointer transition-colors"
              onClick={() => setExpanded(false)}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* Scrollable content */}
            <div className="overflow-y-auto hide-scrollbar flex-1">
              {/* Hero row: image + name/price side by side */}
              <div className="flex gap-4 px-5 pb-4">
                <div className="w-28 h-28 rounded-xl bg-black/30 flex-shrink-0 overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-white text-lg font-bold leading-tight mb-1">
                    {product.name}
                  </h2>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-2xl font-bold ${pColor.text}`}>
                      ${product.price}
                    </span>
                    <span className="text-white/30 text-sm">{product.currency}</span>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed line-clamp-2">
                    {product.description}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/5" />

              <div className="px-5 py-4 space-y-4">
                {/* Specs */}
                <div>
                  <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">
                    Specifications
                  </h3>
                  <div className="space-y-2">
                    {product.specifications.map(spec => (
                      <div
                        key={spec.label}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-white/40">{spec.label}</span>
                        <span className="text-white/80 text-right ml-4">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
                    Condition
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {product.conditionSummary}
                  </p>
                </div>

                {/* Accessories */}
                {product.includedAccessories.length > 0 && (
                  <div>
                    <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
                      Included
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {product.includedAccessories.map((acc, i) => (
                        <span
                          key={i}
                          className="text-white/70 text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full"
                        >
                          {acc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky CTA */}
            <div className="px-5 py-4 border-t border-white/5 bg-[#141414]">
              <button
                className={`w-full py-3.5 rounded-xl font-semibold text-sm cursor-pointer transition-all active:scale-[0.98] ${
                  addedAnimation
                    ? 'bg-green-500 text-white scale-[1.02]'
                    : `${pColor.bg} text-white hover:brightness-110`
                }`}
                onClick={e => {
                  e.stopPropagation()
                  handleAddToBag()
                }}
              >
                {addedAnimation
                  ? `${pColor.emoji} Added to Bag!`
                  : `${pColor.emoji} ${product.callToAction.text} — $${product.price}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal compact card (mobile) */}
      {!expanded && horizontal && (
        <div className="w-full animate-slide-up-in">
          <div className="bg-black/60 backdrop-blur-xl shadow-2xl overflow-hidden border-y border-white/10 flex items-center gap-3 p-2.5 pr-3 relative">
            <button
              className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center bg-black/40 rounded-full text-white/40 hover:text-white text-xs cursor-pointer z-10 transition-colors"
              onClick={e => {
                e.stopPropagation()
                onDismiss()
              }}
            >
              <svg width="8" height="8" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            <div
              className="w-14 h-14 rounded-lg bg-black/30 flex-shrink-0 overflow-hidden cursor-pointer"
              onClick={e => {
                e.stopPropagation()
                setExpanded(true)
              }}
            >
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-contain p-1"
              />
            </div>

            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={e => {
                e.stopPropagation()
                setExpanded(true)
              }}
            >
              <p className="text-white/90 text-xs font-semibold leading-tight truncate pr-4">
                {product.name}
              </p>
              <p className={`${pColor.text} text-sm font-bold mt-0.5`}>
                ${product.price}
              </p>
            </div>

            <button
              className={`px-3 py-2 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-95 shrink-0 ${
                addedAnimation
                  ? 'bg-green-500 text-white'
                  : `${pColor.bg} text-white hover:brightness-110`
              }`}
              onClick={e => {
                e.stopPropagation()
                handleAddToBag()
              }}
            >
              {addedAnimation ? '✓ Added' : `${pColor.emoji} Add`}
            </button>
          </div>
        </div>
      )}

      {/* Compact card (desktop) */}
      {!expanded && !horizontal && (
        <div className="w-44 animate-slide-up-in self-end">
          <div className="bg-gradient-to-b from-[#1e1e1e] to-[#141414] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            {/* Dismiss button */}
            <button
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full text-white/50 hover:text-white text-xs cursor-pointer z-10 transition-colors"
              onClick={e => {
                e.stopPropagation()
                onDismiss()
              }}
            >
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Product image */}
            <div
              className="w-full aspect-[4/3] bg-black/30 cursor-pointer"
              onClick={e => {
                e.stopPropagation()
                setExpanded(true)
              }}
            >
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-contain p-2"
              />
            </div>

            {/* Info */}
            <div className="px-3.5 pb-3.5 pt-2">
              <p className="text-white/90 text-xs font-semibold leading-tight line-clamp-2 mb-1.5">
                {product.name}
              </p>
              <p className={`${pColor.text} text-base font-bold mb-2.5`}>
                ${product.price}
              </p>
              <button
                className={`w-full py-2 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-[0.97] ${
                  addedAnimation
                    ? 'bg-green-500 text-white'
                    : `${pColor.bg} text-white hover:brightness-110`
                }`}
                onClick={e => {
                  e.stopPropagation()
                  handleAddToBag()
                }}
              >
                {addedAnimation ? `${pColor.emoji} Added!` : `${pColor.emoji} ${product.callToAction.text}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
