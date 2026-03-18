'use client'

import type { CartItem } from '../hooks/useCart'

interface CartPanelProps {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  onClear: () => void
  onClose: () => void
  inline?: boolean
}

export default function CartPanel({
  items,
  totalItems,
  totalPrice,
  onUpdateQuantity,
  onRemove,
  onClear,
  onClose,
  inline,
}: CartPanelProps) {
  const content = (
    <div
      className={`${
        inline
          ? 'h-full w-full'
          : 'relative h-full w-80 max-w-[85vw] border-l border-white/5 animate-slide-right-in shadow-2xl'
      } bg-gradient-to-b from-[#1a1a1a] to-[#111] flex flex-col`}
      onClick={e => e.stopPropagation()}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-white/5" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 1.5rem))' }}>
          <div>
            <h2 className="text-white text-lg font-bold tracking-tight">My Bag</h2>
            <p className="text-white/40 text-xs mt-0.5">
              {totalItems === 0
                ? 'Empty'
                : `${totalItems} item${totalItems !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                className="text-white/40 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 hover:text-white/60 transition-colors"
                onClick={onClear}
              >
                Clear
              </button>
            )}
            {!inline && (
              <button
                className="text-white/30 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                onClick={onClose}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-3 space-y-3">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-white/20 text-4xl mb-3">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </div>
              <p className="text-white/30 text-sm">Your bag is empty</p>
              <p className="text-white/20 text-xs mt-1">Tap a product to add it</p>
            </div>
          )}

          {items.map(item => (
            <div
              key={item.productId}
              className="flex gap-3 bg-white/[0.03] rounded-xl p-3"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg bg-black/30 flex-shrink-0 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white/90 text-xs font-medium leading-tight line-clamp-2 mb-1">
                  {item.name}
                </p>
                <p className="text-accent text-sm font-bold">
                  ${item.price}
                </p>

                {/* Quantity controls */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-xs cursor-pointer hover:bg-white/20 transition-colors"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span className="text-white/80 text-xs font-medium w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-xs cursor-pointer hover:bg-white/20 transition-colors"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                  >
                    +
                  </button>

                  <button
                    className="ml-auto text-white/30 hover:text-red-400 cursor-pointer transition-colors"
                    onClick={() => onRemove(item.productId)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Total */}
        {items.length > 0 && (
          <div className="px-5 pt-4 border-t border-white/5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/50 text-sm">Total</span>
              <span className="text-white text-lg font-bold">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
            <button className="w-full py-3 bg-accent text-white font-semibold text-sm rounded-xl cursor-pointer active:scale-[0.98] transition-transform hover:brightness-110">
              Checkout
            </button>
          </div>
        )}

        {/* Swipe-back hint for inline mode */}
        {inline && items.length === 0 && (
          <div className="pb-8 flex flex-col items-center gap-1 text-white/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-[10px]">Swipe to return</span>
          </div>
        )}
      </div>
    )

  if (inline) return content

  return (
    <div
      className="absolute inset-0 z-40 flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" />
      {content}
    </div>
  )
}
