import { useEffect, useState } from 'react'
import { ArrowRight, ChevronRight, Repeat } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { FARBEN, stufeFuer } from '../../lib/produktcheck/bewertung'
import { ausDatenbank, ladeAlternativen, type Alternative, type LebensmittelZeile, type Scan } from '../../lib/produktcheck/produkt'
import { Spinner } from '../../components/ui/Spinner'
import { Punkt } from './ProduktDetail'

export const STUFEN_UEBERSICHT = ['Ausgezeichnet', 'Gut', 'Mäßig', 'Schlecht'] as const

export function letzte30Tage(scans: Scan[]): Scan[] {
  const ab = subDays(new Date(), 30).toISOString()
  return scans.filter(s => s.gescannt_am >= ab && s.punkte != null)
}

/** „Meine Ernährung“: Verteilung der gescannten Produkte der letzten 30 Tage auf die vier Stufen */
export function Uebersicht({ scans, onStufe }: { scans: Scan[]; onStufe: (stufe: string) => void }) {
  const zeitraum = letzte30Tage(scans)
  const anzahl = STUFEN_UEBERSICHT.map(label => zeitraum.filter(s => stufeFuer(s.punkte!).label === label).length)
  const gesamt = anzahl.reduce((a, b) => a + b, 0)
  // Teller als Ringdiagramm: Anteile der Stufen im Uhrzeigersinn
  let start = 0
  const verlauf = gesamt === 0 ? 'var(--color-bg-elevated, #e5e5e5) 0 100%' : anzahl.map((n, i) => {
    const ende = start + (n / gesamt) * 100
    const teil = `${FARBEN[i]} ${start}% ${ende}%`
    start = ende
    return teil
  }).join(', ')
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-bold text-text-primary">Meine Ernährung</h3>
        <p className="text-xs text-text-muted">{format(subDays(new Date(), 30), 'd. MMMM', { locale: de })} → {format(new Date(), 'd. MMMM', { locale: de })}</p>
      </div>
      <div className="mx-auto w-44 h-44 rounded-full p-4" style={{ background: `conic-gradient(${verlauf})` }} role="img"
        aria-label={STUFEN_UEBERSICHT.map((l, i) => `${l}: ${anzahl[i]}`).join(', ')}>
        <div className="w-full h-full rounded-full bg-bg-card/25 border-4 border-white/30" />
      </div>
      {gesamt === 0 && <p className="text-center text-sm text-text-muted">Scanne Produkte, um hier zu sehen, wie gesund du einkaufst.</p>}
      <ul className="card !p-0 divide-y divide-border overflow-hidden">
        {STUFEN_UEBERSICHT.map((label, i) => (
          <li key={label}>
            <button onClick={() => anzahl[i] > 0 && onStufe(label)} className="w-full flex items-center gap-3 p-3.5 text-left">
              <Punkt farbe={i} size={16} />
              <span className="flex-1 text-text-primary">{label}</span>
              <span className="text-text-muted tabular-nums">{anzahl[i]}</span>
              <ChevronRight size={16} className="text-text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface Vorschlag { von: Scan; alternative: Alternative }

/** Bessere Alternativen zu den mäßig oder schlecht bewerteten Produkten der letzten 30 Tage */
export function AlternativenListe({ scans, onOeffnen }: { scans: Scan[]; onOeffnen: (barcode: string) => void }) {
  const [vorschlaege, setVorschlaege] = useState<Vorschlag[] | null>(null)
  const schwach = letzte30Tage(scans).filter(s => s.punkte! < 50).slice(0, 10)
  const schluessel = schwach.map(s => s.barcode).join(',')

  useEffect(() => {
    let aktiv = true
    if (!schluessel) { setVorschlaege([]); return }
    setVorschlaege(null)
    ;(async () => {
      const { data } = await supabase.from('lebensmittel')
        .select('barcode,name,marke,bild,menge,kcal,zucker,gesaettigt,salz,ballast,protein,obst_gemuese,ml,bio,zusatzstoffe,kategorien')
        .in('barcode', schluessel.split(','))
      const produkte = new Map(((data ?? []) as LebensmittelZeile[]).map(z => [z.barcode, ausDatenbank(z)]))
      const liste: Vorschlag[] = []
      for (const s of schwach) {
        const p = produkte.get(s.barcode)
        if (!p?.kategorien.length) continue
        const [beste] = await ladeAlternativen(p, s.punkte)
        if (beste) liste.push({ von: s, alternative: beste })
      }
      if (aktiv) setVorschlaege(liste)
    })().catch(() => aktiv && setVorschlaege([]))
    return () => { aktiv = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel])

  if (vorschlaege === null) return <div className="flex justify-center py-8"><Spinner /></div>
  if (vorschlaege.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12 px-6">
        <div className="p-4 rounded-2xl bg-bg-elevated border border-border mb-4"><Repeat size={28} className="text-brand" /></div>
        <h3 className="font-semibold text-text-primary">Keine Alternativen</h3>
        <p className="text-sm text-text-muted mt-1">Hier erscheinen gesündere Alternativen zu Produkten, die du gescannt hast und die mäßig oder schlecht abschneiden.</p>
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {vorschlaege.map(({ von, alternative: a }) => (
        <li key={von.barcode} className="card !p-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <span className="truncate">Statt {von.name}</span>
            <span className="flex items-center gap-1 shrink-0"><Punkt farbe={stufeFuer(von.punkte!).farbe} size={8} />{von.punkte}/100</span>
          </div>
          <button onClick={() => onOeffnen(a.produkt.barcode)} className="w-full flex items-center gap-3 text-left">
            <ArrowRight size={16} className="text-brand shrink-0" />
            {a.produkt.bild ? <img src={a.produkt.bild} alt="" className="w-12 h-12 rounded-xl object-contain bg-white shrink-0" loading="lazy" /> : <div className="w-12 h-12 rounded-xl bg-bg-elevated shrink-0" />}
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-text-primary truncate">{a.produkt.name}</span>
              {a.produkt.marke && <span className="block text-xs text-text-muted truncate">{a.produkt.marke}</span>}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-text-primary shrink-0"><Punkt farbe={stufeFuer(a.punkte).farbe} size={10} />{a.punkte}/100</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
