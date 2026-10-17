import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Check, ShoppingCart, X } from 'lucide-react'

// ─── Koch-Modus: ein Schritt pro Seite, Bildschirm bleibt an ─────────────────

export function CookMode({ title, steps, ingredients, onClose }: {
  title: string; steps: string[]; ingredients: string[]; onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [showIngredients, setShowIngredients] = useState(false)
  const last = steps.length - 1

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }
    const request = () => { nav.wakeLock?.request('screen').then(l => { lock = l }).catch(() => {}) }
    request()
    const onVisible = () => { if (document.visibilityState === 'visible') request() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { document.removeEventListener('visibilitychange', onVisible); lock?.release().catch(() => {}) }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStep(s => Math.min(last, s + 1))
      else if (e.key === 'ArrowLeft') setStep(s => Math.max(0, s - 1))
      else if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [last, onClose])

  return createPortal(
    <div className="fixed inset-0 z-[95] bg-bg flex flex-col" role="dialog" aria-label={`Kochmodus: ${title}`}>
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted" aria-label="Kochmodus beenden">
          <X size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text-primary truncate">{title}</div>
          <div className="text-xs text-text-muted">Schritt {step + 1} von {steps.length}</div>
        </div>
        {ingredients.length > 0 && (
          <button onClick={() => setShowIngredients(v => !v)}
            className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1.5 transition-colors ${showIngredients ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-secondary'}`}>
            <ShoppingCart size={14} /> Zutaten
          </button>
        )}
      </div>
      <div className="h-1 bg-border shrink-0" aria-hidden="true">
        <div className="h-full bg-brand transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center max-w-2xl w-full mx-auto">
        {showIngredients ? (
          <ul className="space-y-2.5 text-lg text-text-primary">
            {ingredients.map((ing, i) => <li key={i} className="flex gap-3"><span className="text-brand">•</span><span>{ing}</span></li>)}
          </ul>
        ) : (
          <>
            <div className="text-sm font-semibold text-brand mb-3">Schritt {step + 1}</div>
            <p className="text-2xl leading-relaxed text-text-primary font-medium">{steps[step]}</p>
          </>
        )}
      </div>

      <div className="p-4 border-t border-border flex gap-3 shrink-0 max-w-2xl w-full mx-auto">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          className="btn-secondary flex-1 flex items-center justify-center gap-2 py-4 text-base disabled:opacity-40">
          <ArrowLeft size={18} /> Zurück
        </button>
        {step < last ? (
          <button onClick={() => setStep(s => Math.min(last, s + 1))}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-base">
            Weiter <ArrowRight size={18} />
          </button>
        ) : (
          <button onClick={onClose} className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-base">
            <Check size={18} /> Fertig, guten Appetit!
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
