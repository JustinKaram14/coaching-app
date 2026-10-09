// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { X } from 'lucide-react'

export function BottomSheet({ open: e, onClose: t, title: n, children: r, tall: i }) {
  let [a, o] = useState(e),
    [s, c] = useState(false)
  return (
    useEffect(() => {
      if (e) {
        ;(o(true), c(false))
        return
      }
      if (!a) return
      c(true)
      let t = window.setTimeout(() => {
        ;(o(false), c(false))
      }, 240)
      return () => window.clearTimeout(t)
    }, [e, a]),
    useEffect(() => {
      if (!e) return
      let n = (e) => {
        e.key === 'Escape' && t()
      }
      return (document.addEventListener('keydown', n), () => document.removeEventListener('keydown', n))
    }, [e, t]),
    a ? (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label={n}
      >
        <div className={cn('absolute inset-0 bg-black/60', s ? 'fade-out' : 'fade-in')} onClick={t} />
        <div
          className={cn(
            'relative w-full sm:max-w-xl bg-bg-card border border-border shadow-card flex flex-col',
            'rounded-t-4xl sm:rounded-4xl pb-[max(1rem,env(safe-area-inset-bottom))]',
            i ? 'h-[92dvh] sm:h-[80vh]' : 'max-h-[88dvh]',
            s ? 'sheet-out' : 'sheet-in',
          )}
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 shrink-0">
            <h2 className="text-lg font-bold text-text-primary truncate">{n}</h2>
            <button
              onClick={t}
              className="p-2 rounded-full bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Schließen"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-2">{r}</div>
        </div>
      </div>
    ) : null
  )
}
