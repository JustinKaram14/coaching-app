// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { X } from 'lucide-react'

export function BottomSheet({ open: isOpen, onClose: handleClose, title: heading, children: content, tall: isTall }) {
  let [mounted, setMounted] = useState(isOpen),
    [closing, setClosing] = useState(false)
  return (
    useEffect(() => {
      if (isOpen) {
        ;(setMounted(true), setClosing(false))
        return
      }
      if (!mounted) return
      setClosing(true)
      let timer = window.setTimeout(() => {
        ;(setMounted(false), setClosing(false))
      }, 240)
      return () => window.clearTimeout(timer)
    }, [isOpen, mounted]),
    useEffect(() => {
      if (!isOpen) return
      let onKeyDown = (event) => {
        event.key === 'Escape' && handleClose()
      }
      return (document.addEventListener('keydown', onKeyDown), () => document.removeEventListener('keydown', onKeyDown))
    }, [isOpen, handleClose]),
    mounted ? (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className={cn('absolute inset-0 bg-black/60', closing ? 'fade-out' : 'fade-in')} onClick={handleClose} />
        <div
          className={cn(
            'relative w-full sm:max-w-xl bg-bg-card border border-border shadow-card flex flex-col',
            'rounded-t-4xl sm:rounded-4xl pb-[max(1rem,env(safe-area-inset-bottom))]',
            isTall ? 'h-[92dvh] sm:h-[80vh]' : 'max-h-[88dvh]',
            closing ? 'sheet-out' : 'sheet-in',
          )}
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 shrink-0">
            <h2 className="text-lg font-bold text-text-primary truncate">{heading}</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Schließen"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-2">{content}</div>
        </div>
      </div>
    ) : null
  )
}
