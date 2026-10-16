import { useCallback, useState } from 'react'
import { ShoppingCart, Trash2, X } from 'lucide-react'
import type { EinkaufsEintrag, EinkaufsListe } from '../../../lib/entdecken/einkauf'
import { listeText, portionenTextKurz, teile } from '../../../lib/entdecken/teilen'
import { DruckAnsicht, ListeDruck } from './Druck'
import { Sheet, TeilenDruckenLeiste, teilenMeldung } from './gemeinsam'

export function EinkaufslisteSheet({ liste, eintraege, haken, onHaken, onEntfernen, onLeeren, onHakenLoeschen, nurLokal, onClose }: {
  liste: EinkaufsListe; eintraege: EinkaufsEintrag[]; haken: ReadonlySet<string>
  onHaken: (id: string) => void; onEntfernen: (id: string) => void; onLeeren: () => void; onHakenLoeschen: () => void
  nurLokal: boolean; onClose: () => void
}) {
  const [drucken, setDrucken] = useState(false)
  const [status, setStatus] = useState('')
  const [leerenFrage, setLeerenFrage] = useState(false)
  const druckFertig = useCallback(() => setDrucken(false), [])

  const erledigt = liste.bereiche.reduce((s, b) => s + b.zeilen.filter(z => haken.has(z.id)).length, 0)

  async function teilen() {
    setStatus(teilenMeldung(await teile('Einkaufsliste', listeText(liste, haken))))
  }

  return (
    <Sheet titel="Einkaufsliste" untertitel={liste.anzahl > 0 ? `${erledigt} von ${liste.anzahl} erledigt` : undefined} onClose={onClose} z={85}
      footer={eintraege.length > 0 ? <TeilenDruckenLeiste onTeilen={teilen} onDrucken={() => setDrucken(true)} status={status} /> : undefined}>
      {eintraege.length === 0 ? (
        <div className="text-center py-10 space-y-2 text-sm text-text-muted">
          <ShoppingCart size={28} className="mx-auto text-text-muted" aria-hidden="true" />
          <div>Deine Einkaufsliste ist leer.</div>
          <div>Öffne ein Rezept und tippe auf „Auf die Einkaufsliste“.</div>
        </div>
      ) : (
        <div className="space-y-5">
          <section aria-label="Rezepte auf der Liste" className="space-y-2">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Rezepte auf der Liste</div>
            <ul className="flex flex-wrap gap-1.5" data-testid="einkauf-rezepte">
              {eintraege.map(e => (
                <li key={e.id} className="inline-flex items-center gap-1.5 rounded-full bg-bg-elevated border border-border pl-3 pr-1 py-1 text-xs text-text-primary">
                  <span>{e.rezeptName} · {portionenTextKurz(e.portionen)} Port.</span>
                  <button onClick={() => onEntfernen(e.id)} aria-label={`${e.rezeptName} von der Liste entfernen`} className="p-1 rounded-full text-text-muted hover:text-danger"><X size={12} /></button>
                </li>
              ))}
            </ul>
            {liste.verwaist.length > 0 && <p className="text-xs text-warning">{liste.verwaist.length === 1 ? 'Ein Rezept existiert' : `${liste.verwaist.length} Rezepte existieren`} nicht mehr und zählt nicht mit. Entferne es oben.</p>}
          </section>

          {liste.bereiche.map(b => (
            <section key={b.name} aria-label={b.name} className="space-y-1.5">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">{b.name}</h3>
              <ul className="rounded-2xl bg-bg-elevated border border-border divide-y divide-border">
                {b.zeilen.map(z => {
                  const fertig = haken.has(z.id)
                  return (
                    <li key={z.id}>
                      <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none">
                        <input type="checkbox" checked={fertig} onChange={() => onHaken(z.id)} className="w-4 h-4 accent-[rgb(var(--c-brand))] shrink-0" />
                        <span className={`flex-1 text-sm ${fertig ? 'line-through text-text-muted' : 'text-text-primary'}`}>{z.text}</span>
                        {z.aus.length > 1 && <span className="text-[10px] text-text-muted shrink-0">{z.aus.length} Rezepte</span>}
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          <div className="flex items-center gap-3 text-xs">
            {erledigt > 0 && <button onClick={onHakenLoeschen} className="text-text-muted hover:text-text-primary">Haken zurücksetzen</button>}
            <span className="flex-1" />
            {leerenFrage ? (
              <span className="flex items-center gap-2">
                <span className="text-text-secondary">Liste wirklich leeren?</span>
                <button onClick={() => { onLeeren(); setLeerenFrage(false) }} className="text-danger font-semibold">Ja, leeren</button>
                <button onClick={() => setLeerenFrage(false)} className="text-text-muted">Abbrechen</button>
              </span>
            ) : (
              <button onClick={() => setLeerenFrage(true)} className="inline-flex items-center gap-1 text-text-muted hover:text-danger"><Trash2 size={12} /> Liste leeren</button>
            )}
          </div>
          <p className="text-[11px] text-text-muted">Mengen sind aus den Rezepten zusammengerechnet. Haken werden nur auf diesem Gerät gemerkt.{nurLokal && ' Die Liste wird gerade nur auf diesem Gerät gespeichert, bis die Datenbank aktualisiert ist.'}</p>
        </div>
      )}
      {drucken && <DruckAnsicht onFertig={druckFertig}><ListeDruck liste={liste} haken={haken} /></DruckAnsicht>}
    </Sheet>
  )
}
