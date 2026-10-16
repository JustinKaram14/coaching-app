import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Heart, Info, Printer, Share2, X } from 'lucide-react'
import type { Mahlzeit, Rezept } from '../../../lib/entdecken/types'
import { KEINE_AERZTLICHE_EMPFEHLUNG } from '../../../lib/entdecken/katalog'

/** Bodenblech bzw. Dialog. Wird in <body> gerendert, weil die Seiten-Einblendung (.page > * > *) sonst „fixed“ aushebelt. */
export function Sheet({ titel, untertitel, onClose, children, footer, z = 80 }: {
  titel: string; untertitel?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; z?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = vorher }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: z }} role="dialog" aria-modal="true" aria-label={titel}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-card rounded-t-3xl sm:rounded-3xl border border-border w-full max-w-lg max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary">{titel}</div>
            {untertitel && <div className="text-xs text-text-muted mt-0.5">{untertitel}</div>}
          </div>
          <button onClick={onClose} aria-label="Schließen" className="p-1.5 rounded-xl hover:bg-bg-elevated text-text-muted shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-border shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

const MAHLZEIT_EMOJI: Record<Mahlzeit, string> = { Frühstück: '🌅', Mittagessen: '☀️', Abendessen: '🌙', Snack: '🍎' }

/** Foto mit Platzhalter, solange es noch kein (oder ein defektes) Bild gibt */
export function RezeptBild({ r, className = '' }: { r: Rezept; className?: string }) {
  const [fehler, setFehler] = useState(false)
  useEffect(() => setFehler(false), [r.bildUrl])
  if (r.bildUrl && !fehler) {
    return <img src={r.bildUrl} alt={r.name} loading="lazy" onError={() => setFehler(true)} className={`object-cover ${className}`} />
  }
  return (
    <div className={`bg-gradient-to-br from-brand/20 to-accent/10 flex flex-col items-center justify-center gap-1 ${className}`} aria-label={`${r.name} (Foto folgt)`}>
      <span className="text-3xl" aria-hidden="true">{MAHLZEIT_EMOJI[r.mahlzeiten[0]]}</span>
      <span className="text-[10px] text-text-muted">Foto folgt</span>
    </div>
  )
}

/** Kleiner, aber lesbarer Hinweis bei Gesundheits-Tags und Nährwert-Scores; der ausführliche Text steht im Reiter „Gesundheitshinweis“ */
export function Hinweis({ lang = false, className = '' }: { lang?: boolean; className?: string }) {
  return (
    <p role="note" className={`flex items-start gap-1.5 text-[11px] leading-snug text-text-muted ${className}`}>
      <Info size={12} className="shrink-0 mt-px" aria-hidden="true" />
      <span>
        <strong className="font-semibold text-text-secondary">{KEINE_AERZTLICHE_EMPFEHLUNG}.</strong>
        {lang && ' Tags und Scores sind Schätzungen aus Durchschnittswerten der Zutaten.'}{' '}
        <Link to="/legal?tab=gesundheit" className="text-brand hover:underline whitespace-nowrap">Mehr dazu</Link>
      </span>
    </p>
  )
}

/** 1–3 Punkte für Antioxidantien (Schätzung) */
export function AoxPunkte({ punkte }: { punkte: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Antioxidantien-Score ${punkte} von 3, Schätzung`}>
      {[1, 2, 3].map(i => (
        <span key={i} className={`w-2 h-2 rounded-full ${i <= punkte ? 'bg-accent' : 'bg-border'}`} />
      ))}
    </span>
  )
}

export interface Tag { text: string; ton: 'brand' | 'info' | 'warning' | 'success' | 'accent'; punkte?: number }

/** Gesundheits-Tags eines Rezepts (alle als Schätzung zu verstehen) */
export function gesundheitsTags(r: Rezept): Tag[] {
  const g = r.gesundheit
  const tags: Tag[] = []
  if (g.ballaststoffreich) tags.push({ text: `Ballaststoffreich · ${Math.round(r.pro.ballast)} g`, ton: 'success' })
  if (g.antioxidantien > 0) tags.push({ text: 'Antioxidantien (Schätzung)', ton: 'accent', punkte: g.antioxidantien })
  if (g.praebiotisch) tags.push({ text: 'Präbiotisch', ton: 'brand' })
  if (g.probiotisch) tags.push({ text: 'Probiotisch', ton: 'brand' })
  if (g.fermentiert) tags.push({ text: 'Fermentiert', ton: 'brand' })
  if (g.leichtVerdaulich) tags.push({ text: 'Leicht verdaulich', ton: 'info' })
  if (g.omega3Reich) tags.push({ text: 'Omega-3-reich', ton: 'info' })
  if (g.entzuendungshemmend) tags.push({ text: 'Entzündungshemmend', ton: 'info' })
  return tags
}

const TON: Record<Tag['ton'], string> = {
  brand: 'bg-brand/10 text-brand border-brand/30',
  info: 'bg-info/10 text-info border-info/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  success: 'bg-success/10 text-success border-success/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
}

export function TagChip({ tag }: { tag: Tag }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TON[tag.ton]}`}>
      {tag.text}
      {tag.punkte ? <AoxPunkte punkte={tag.punkte} /> : null}
    </span>
  )
}

export function zahl(n: number, stellen = 0): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen })
}

// ─── Favoriten ───────────────────────────────────────────────────────────────

export const FavoritenKontext = createContext<{ favoriten: ReadonlySet<string>; umschalten: (id: string) => void }>({
  favoriten: new Set(), umschalten: () => {},
})

/** Herz zum Merken eines Rezepts */
export function FavoritHerz({ r, className = '', beschriftung = false }: { r: Rezept; className?: string; beschriftung?: boolean }) {
  const { favoriten, umschalten } = useContext(FavoritenKontext)
  const aktiv = favoriten.has(r.id)
  const label = aktiv ? `${r.name} aus den Favoriten entfernen` : `${r.name} zu den Favoriten`
  return (
    <button type="button" aria-pressed={aktiv} aria-label={beschriftung ? undefined : label} title={aktiv ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
      onClick={e => { e.stopPropagation(); umschalten(r.id) }}
      className={`inline-flex items-center justify-center gap-1.5 transition-colors ${className}`}>
      <Heart size={beschriftung ? 16 : 15} className={aktiv ? 'fill-danger text-danger' : ''} aria-hidden="true" />
      {beschriftung && <span className="text-sm font-semibold">{aktiv ? 'Favorit' : 'Merken'}</span>}
    </button>
  )
}

// ─── Teilen und Drucken ──────────────────────────────────────────────────────

export function TeilenDruckenLeiste({ onTeilen, onDrucken, status, className = '' }: {
  onTeilen: () => void; onDrucken: () => void; status?: string; className?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button onClick={onTeilen} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"><Share2 size={15} /> Teilen</button>
      <button onClick={onDrucken} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"><Printer size={15} /> Drucken</button>
      {status && <span className="text-xs text-text-muted w-full" role="status">{status}</span>}
    </div>
  )
}

/** Meldung nach dem Teilen */
export function teilenMeldung(e: 'geteilt' | 'kopiert' | 'abgebrochen' | 'fehler'): string {
  return e === 'kopiert' ? 'In die Zwischenablage kopiert.' : e === 'fehler' ? 'Teilen hat nicht geklappt.' : ''
}

// ─── Einkaufsliste (Kontext) ─────────────────────────────────────────────────

export const EinkaufKontext = createContext<{
  hinzufuegen: (r: Rezept, portionen: number) => Promise<boolean>
  portionenAufListe: (rezeptId: string) => number | null
  oeffneListe: () => void
}>({ hinzufuegen: async () => false, portionenAufListe: () => null, oeffneListe: () => {} })
