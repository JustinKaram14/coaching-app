import { Coins } from 'lucide-react'
import { euroSpanne, kostenBrauchbar, type Kosten } from '../lib/einkauf/preise'

/** Kostenschätzung eines Gerichts: groß pro Portion, klein für das ganze Rezept */
export function KostenPrognose({ kosten, rezeptPortionen, portionen }: {
  /** Kosten für das ganze Rezept, wie es hinterlegt ist */
  kosten: Kosten
  /** Portionen, für die das Rezept hinterlegt ist */
  rezeptPortionen: number
  /** gewählte Portionen */
  portionen: number
}) {
  if (!kostenBrauchbar(kosten)) return null
  const basis = Math.max(1, rezeptPortionen)
  const proMin = kosten.min / basis
  const proMax = kosten.max / basis
  const p = Math.round(portionen * 10) / 10
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-elevated" data-testid="kosten-prognose">
      <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center shrink-0">
        <Coins size={18} className="text-success" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary">≈ {euroSpanne(proMin, proMax)} <span className="font-normal text-text-secondary">pro Portion</span></div>
        <div className="text-[11px] text-text-muted">
          {euroSpanne(proMin * p, proMax * p)} für {String(p).replace('.', ',')} {p === 1 ? 'Portion' : 'Portionen'} · Discounter bis Supermarkt, geschätzt
          {kosten.ohnePreis.length > 0 && ` · ${kosten.ohnePreis.length} Zutat${kosten.ohnePreis.length === 1 ? '' : 'en'} ohne Preis`}
        </div>
      </div>
    </div>
  )
}

/** Kurzform für Rezeptkarten: „≈ 2,40 €/Port.“ (Mittelwert der Spanne) */
export function kostenKurz(kosten: Kosten, rezeptPortionen: number): string | null {
  if (!kostenBrauchbar(kosten)) return null
  const mitte = (kosten.min + kosten.max) / 2 / Math.max(1, rezeptPortionen)
  return `≈ ${mitte.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/Port.`
}
