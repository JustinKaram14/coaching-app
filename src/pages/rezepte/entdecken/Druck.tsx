import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { EinkaufsListe } from '../../../lib/entdecken/einkauf'
import type { Rezept } from '../../../lib/entdecken/types'
import { ZUTATEN, zutatZeile } from '../../../lib/entdecken/zutaten'
import { portionenTextKurz } from '../../../lib/entdecken/teilen'
import { zahl } from './gemeinsam'

/** Rendert den Inhalt unsichtbar in <body> und öffnet den Druckdialog; nur @media print zeigt ihn an */
export function DruckAnsicht({ onFertig, children }: { onFertig: () => void; children: ReactNode }) {
  useEffect(() => {
    const t = setTimeout(() => { try { window.print() } catch { onFertig() } }, 150)
    // Auf Handys kehrt print() sofort zurück: Inhalt bleibt, bis der Dialog zu ist (oder nach einer Minute)
    const sicherheit = setTimeout(onFertig, 60_000)
    window.addEventListener('afterprint', onFertig)
    return () => { clearTimeout(t); clearTimeout(sicherheit); window.removeEventListener('afterprint', onFertig) }
  }, [onFertig])
  return createPortal(<div className="druck-bereich" data-testid="druck-bereich">{children}</div>, document.body)
}

export function RezeptDruck({ r, portionen }: { r: Rezept; portionen: number }) {
  const faktor = portionen / r.portionen
  const n = r.pro
  return (
    <>
      <h1>{r.name}</h1>
      <div>{r.zeitMin} Min. · Zutaten für {portionenTextKurz(portionen)} {portionen === 1 ? 'Portion' : 'Portionen'} · {Math.round(n.kcal)} kcal pro Portion</div>
      <h2>Zutaten</h2>
      <ul>{r.zutaten.map((z, i) => (ZUTATEN[z.id] ? <li key={i}>{zutatZeile(ZUTATEN[z.id], z.g * faktor)}</li> : null))}</ul>
      <h2>Anleitung</h2>
      <ol>{r.schritte.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <h2>Nährwerte pro Portion</h2>
      <table><tbody>
        {([['Kalorien', n.kcal, 'kcal', 0], ['Eiweiß', n.protein, 'g', 1], ['Kohlenhydrate', n.kh, 'g', 1], ['davon Zucker', n.zucker, 'g', 1], ['Ballaststoffe', n.ballast, 'g', 1],
          ['Fett', n.fett, 'g', 1], ['davon gesättigt', n.gesaettigt, 'g', 1], ['Salz', n.salz, 'g', 1]] as const).map(([l, v, u, s]) => (
          <tr key={l}><td>{l}</td><td>{zahl(v, s)} {u}</td></tr>
        ))}
      </tbody></table>
      <div className="druck-klein">Nährwerte sind Schätzungen aus Durchschnittswerten der Zutaten. Aus HLX Together.</div>
    </>
  )
}

export function ListeDruck({ liste, haken }: { liste: EinkaufsListe; haken: ReadonlySet<string> }) {
  return (
    <>
      <h1>Einkaufsliste</h1>
      {liste.bereiche.map(b => (
        <div key={b.name}>
          <h2>{b.name}</h2>
          <ul className="druck-box">{b.zeilen.map(z => <li key={z.id} className={haken.has(z.id) ? 'erledigt' : ''}>{z.text}</li>)}</ul>
        </div>
      ))}
      <div className="druck-klein">Aus HLX Together.</div>
    </>
  )
}
