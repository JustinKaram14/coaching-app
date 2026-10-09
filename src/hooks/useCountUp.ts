import { useLayoutEffect, useRef } from 'react'

// Während die Startanimation läuft, hält index.html die Klasse sp-hold auf <html>.
// Zahlen warten dann auf das Signal "app-reveal", damit man das Hochzählen auch sieht.
const holding = () => document.documentElement.classList.contains('sp-hold')
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Zählt eine Zahl weich zum Zielwert hoch (ease-out) und schreibt sie direkt in das Element.
 * Es gibt bewusst keinen React-State: Die Seite wird pro Bild nicht neu gerendert, nur ein Text ändert sich.
 * Ändert sich das Ziel mitten in der Bewegung, geht es von der gerade sichtbaren Zahl weiter.
 * Das Element bekommt keine Kinder von React, der Text kommt allein von hier.
 */
export function useCountUpText<T extends Element>(
  target: number,
  format: (n: number) => string,
  { duration = 1000, delay = 0 }: { duration?: number; delay?: number } = {},
) {
  const ref = useRef<T>(null)
  const shown = useRef(0)
  const fmt = useRef(format)
  fmt.current = format

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const write = (v: number) => { el.textContent = fmt.current(v) }

    if (reducedMotion() || shown.current === target) {
      shown.current = target
      write(target)
      return
    }
    const from = shown.current
    write(from) // Startwert sofort sichtbar (kein Aufblitzen)
    let raf = 0
    let cancelled = false

    const run = () => {
      const start = performance.now() + delay
      const tick = (now: number) => {
        if (cancelled) return
        const p = Math.min(1, Math.max(0, (now - start) / duration))
        const eased = 1 - Math.pow(1 - p, 4)
        const v = p >= 1 ? target : from + (target - from) * eased
        shown.current = v
        write(v)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    if (holding()) window.addEventListener('app-reveal', run, { once: true })
    else run()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('app-reveal', run)
    }
  }, [target, duration, delay])

  return ref
}
