import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { Sheet, Hinweis } from './gemeinsam'
import { RezeptKarte } from './RezeptKarte'
import { todayISO } from '../../../lib/utils'
import {
  PFLANZEN, PFLANZEN_GRUPPEN, PFLANZEN_ZIEL, eigenePflanze, pflanzenVon, wochenEnde, wochenLabel, wochenStart,
  type Pflanze,
} from '../../../lib/entdecken/pflanzen'
import { schreibePflanzen, usePflanzen } from '../../../lib/entdecken/pflanzenDaten'
import { normalisiere, type Treffer } from '../../../lib/entdecken/filter'

export function FortschrittsBalken({ anzahl }: { anzahl: number }) {
  const anteil = Math.min(1, anzahl / PFLANZEN_ZIEL)
  return (
    <div className="h-2.5 rounded-full bg-bg-elevated overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={PFLANZEN_ZIEL} aria-valuenow={Math.min(PFLANZEN_ZIEL, anzahl)} aria-label="Pflanzen diese Woche">
      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${anteil * 100}%` }} />
    </div>
  )
}

export function PflanzenSheet({ userId, vorschlagsPool, onOeffnen, onClose }: {
  userId: string; vorschlagsPool: Treffer[]; onOeffnen: (t: Treffer) => void; onClose: () => void
}) {
  const heute = todayISO()
  const aktuelleWoche = wochenStart(heute)
  const [verschiebung, setVerschiebung] = useState(0)
  const start = wochenStart(heute, verschiebung)
  const istAktuell = verschiebung === 0
  const { stand, laden, nurLokal, entfernen } = usePflanzen(userId, start)
  const [suche, setSuche] = useState('')
  const [eigen, setEigen] = useState('')
  const [datum, setDatum] = useState(heute)
  const [meldung, setMeldung] = useState('')

  const ende = wochenEnde(start)
  const maxDatum = ende < heute ? ende : heute
  // Datum bleibt in der angezeigten Woche und nie in der Zukunft
  const gueltigesDatum = datum >= start && datum <= maxDatum ? datum : maxDatum

  const vorhanden = new Set(stand.pflanzen.map(x => x.p.key))
  const gruppen = PFLANZEN_GRUPPEN.map(gr => ({ gr, liste: stand.pflanzen.filter(x => x.p.gruppe === gr) })).filter(x => x.liste.length > 0)
  const q = normalisiere(suche)
  const kandidaten = PFLANZEN.filter(p => !vorhanden.has(p.key) && (!q || normalisiere(p.name).includes(q)))

  const vorschlaege = useMemo(() => {
    if (!istAktuell) return []
    return vorschlagsPool
      .map(t => ({ t, neu: pflanzenVon(t.r.zutaten).filter(p => !vorhanden.has(p.key)).length }))
      .filter(x => x.neu >= 2 && x.t.weich.length === 0 && x.t.warnungen.length === 0)
      .sort((a, b) => b.neu - a.neu || a.t.r.pro.kcal - b.t.r.pro.kcal)
      .slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vorschlagsPool, stand, istAktuell])

  async function hinzufuegen(p: Pflanze) {
    setMeldung('')
    const ok = await schreibePflanzen(userId, [p], gueltigesDatum, 'manuell')
    if (!ok) setMeldung('Das hat nicht geklappt. Bitte versuche es noch einmal.')
    else setSuche('')
  }

  return (
    <Sheet titel="Pflanzen der Woche" untertitel="Ziel: 30 verschiedene Pflanzen pro Woche" onClose={onClose} z={85}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setVerschiebung(v => v - 1)} aria-label="Vorherige Woche" className="p-2 rounded-xl hover:bg-bg-elevated border border-border"><ChevronLeft size={16} /></button>
          <div className="text-center">
            <div className="text-sm font-semibold text-text-primary">{wochenLabel(start)}</div>
            {istAktuell && <div className="text-xs text-brand">Diese Woche</div>}
          </div>
          <button onClick={() => setVerschiebung(v => Math.min(0, v + 1))} disabled={istAktuell} aria-label="Nächste Woche"
            className="p-2 rounded-xl hover:bg-bg-elevated border border-border disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>

        <div className="space-y-2" data-testid="pflanzen-stand">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-text-primary tabular-nums">{laden ? '–' : stand.anzahl}<span className="text-base font-medium text-text-secondary"> / {PFLANZEN_ZIEL}</span></span>
            <span className="text-sm text-text-secondary">{laden ? '' : stand.anzahl >= PFLANZEN_ZIEL ? 'Ziel erreicht 🎉' : `noch ${PFLANZEN_ZIEL - stand.anzahl}`}</span>
          </div>
          <FortschrittsBalken anzahl={laden ? 0 : stand.anzahl} />
        </div>
        <Hinweis lang />

        {laden ? <div className="text-sm text-text-muted">Wird geladen…</div> : stand.anzahl === 0 ? (
          <div className="text-sm text-text-muted rounded-2xl bg-bg-elevated border border-border p-4">
            In dieser Woche ist noch nichts eingetragen. Pflanzen kommen automatisch dazu, wenn du ein Rezept ins Tagebuch einträgst, oder du trägst sie unten selbst ein.
          </div>
        ) : (
          <div className="space-y-3">
            {gruppen.map(({ gr, liste }) => (
              <section key={gr} aria-label={gr} className="space-y-1.5">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">{gr} · {liste.length}</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {liste.map(({ p, tage }) => (
                    <li key={p.key} className="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/30 text-success text-xs font-medium pl-2.5 pr-1 py-1">
                      <span>{p.name}{tage.length > 1 ? ` ×${tage.length}` : ''}</span>
                      <button onClick={() => void entfernen(p.key)} aria-label={`${p.name} aus der Woche entfernen`} className="p-0.5 rounded-full hover:bg-success/20"><X size={11} /></button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Von Hand eintragen */}
        <section aria-label="Pflanze eintragen" className="space-y-2 rounded-2xl border border-border p-3">
          <h3 className="text-sm font-semibold text-text-primary">Pflanze eintragen</h3>
          <div className="flex gap-2">
            <input className="input" placeholder="Pflanze suchen" aria-label="Pflanze suchen" value={suche} onChange={e => setSuche(e.target.value)} />
            <input type="date" className="input w-40 shrink-0" aria-label="Tag" min={start} max={maxDatum} value={gueltigesDatum} onChange={e => e.target.value && setDatum(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto" data-testid="pflanzen-kandidaten">
            {kandidaten.slice(0, q ? 30 : 24).map(p => (
              <button key={p.key} onClick={() => void hinzufuegen(p)} className="text-xs rounded-full border border-dashed border-border px-2.5 py-1 text-text-secondary hover:border-brand/60 hover:text-text-primary">+ {p.name}</button>
            ))}
            {kandidaten.length === 0 && <span className="text-xs text-text-muted">Nichts gefunden. Trag sie unten als eigene Pflanze ein.</span>}
          </div>
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); const p = eigenePflanze(eigen); if (p.name.length >= 2) { void hinzufuegen(p); setEigen('') } }}>
            <input className="input" placeholder="Eigene, z. B. Rosenkohl" aria-label="Eigene Pflanze" maxLength={40} value={eigen} onChange={e => setEigen(e.target.value)} />
            <button type="submit" className="btn-secondary px-4 flex items-center gap-1" disabled={eigen.trim().length < 2}><Plus size={14} />Hinzufügen</button>
          </form>
          {meldung && <div className="text-xs text-danger" role="alert">{meldung}</div>}
        </section>

        {vorschlaege.length > 0 && (
          <section aria-label="Neue Pflanzen entdecken" className="space-y-2">
            <h3 className="font-bold text-text-primary">Das bringt neue Pflanzen</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x scrollbar-none">
              {vorschlaege.map(({ t, neu }) => (
                <div key={t.r.id} className="snap-start shrink-0 w-44">
                  <RezeptKarte t={t} breit onOpen={() => { onClose(); onOeffnen(t) }} zusatz={`+${neu} neue Pflanzen`} />
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-[11px] text-text-muted">
          Gezählt werden verschiedene Pflanzenarten, jede Menge reicht. Dieselbe Pflanze zählt einmal (Tomate, Kirschtomate und Dosentomate sind eine). Öle, Zucker, Honig und Salz zählen nicht.
          Nudeln und Couscous zählen als Weizen, Tofu und Edamame als Soja. Einträge aus anderen Tagebuch-Quellen (z. B. Barcode) fließen nicht ein, trag sie hier selbst ein.
          {nurLokal && ' Die Woche wird gerade nur auf diesem Gerät gespeichert, bis die Datenbank aktualisiert ist.'}
        </p>
      </div>
    </Sheet>
  )
}
