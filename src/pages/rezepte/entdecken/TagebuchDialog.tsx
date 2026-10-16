import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Minus, Plus } from 'lucide-react'
import { Spinner } from '../../../components/ui/Spinner'
import { todayISO } from '../../../lib/utils'
import { naehrwerteFuerMenge, type MengenModus } from '../../../lib/entdecken/engine'
import { eintragenInTagebuch } from '../../../lib/entdecken/daten'
import { naechsteMahlzeit } from '../../../lib/entdecken/filter'
import { MAHLZEITEN, type Mahlzeit, type Rezept } from '../../../lib/entdecken/types'
import { Sheet, zahl } from './gemeinsam'

/** Menge wählen (Portion oder Gramm) und das Rezept ins Ernährungs-Tagebuch eintragen */
export function TagebuchDialog({ r, userId, onClose }: { r: Rezept; userId: string; onClose: () => void }) {
  const vorschlag = useMemo<Mahlzeit>(() => {
    const zeitlich = naechsteMahlzeit([], new Date().getHours())
    return r.mahlzeiten.includes(zeitlich) ? zeitlich : r.mahlzeiten[0]
  }, [r])
  const [mahlzeit, setMahlzeit] = useState<Mahlzeit>(vorschlag)
  const [datum, setDatum] = useState(todayISO())
  const [modus, setModus] = useState<MengenModus>('portion')
  const [menge, setMenge] = useState(1)
  const [speichert, setSpeichert] = useState(false)
  const [fertig, setFertig] = useState<null | { ohneBallaststoffe: boolean }>(null)
  const [fehler, setFehler] = useState('')

  const schritt = modus === 'portion' ? 0.5 : 10
  const min = modus === 'portion' ? 0.25 : 10
  const { n, gramm } = naehrwerteFuerMenge(r, modus, menge)

  function wechsle(neu: MengenModus) {
    if (neu === modus) return
    setMenge(neu === 'gramm' ? Math.max(10, Math.round((menge * r.portionG) / 10) * 10) : Math.max(0.25, Math.round((menge / r.portionG) * 4) / 4))
    setModus(neu)
  }

  async function eintragen() {
    if (!(menge > 0)) return
    setSpeichert(true)
    setFehler('')
    const res = await eintragenInTagebuch(userId, r, { datum, mahlzeit, modus, menge })
    setSpeichert(false)
    if (res.ok) setFertig({ ohneBallaststoffe: res.ohneBallaststoffe })
    else setFehler('Das Eintragen hat nicht geklappt. Bitte versuche es noch einmal.')
  }

  return (
    <Sheet titel="Ins Tagebuch eintragen" untertitel={r.name} onClose={onClose} z={90}
      footer={fertig ? (
        <div className="flex gap-2">
          <Link to="/nutrition" onClick={onClose} className="btn-primary flex-1 text-center">Zum Tagebuch</Link>
          <button onClick={onClose} className="btn-secondary">Schließen</button>
        </div>
      ) : (
        <button onClick={eintragen} disabled={speichert || !(menge > 0)} className="btn-primary w-full flex items-center justify-center gap-2">
          {speichert ? <Spinner size={16} /> : <Check size={16} />} Eintragen
        </button>
      )}>
      {fertig ? (
        <div className="text-center py-6 space-y-2" role="status">
          <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto"><Check size={24} /></div>
          <div className="font-semibold text-text-primary">Eingetragen</div>
          <div className="text-sm text-text-secondary">{r.name} · {Math.round(n.kcal)} kcal · {mahlzeit}</div>
          {fertig.ohneBallaststoffe && (
            <div className="text-xs text-warning">Die Ballaststoffe wurden noch nicht mitgespeichert, weil die Datenbank noch nicht aktualisiert ist.</div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="tb-mahlzeit">Mahlzeit</label>
              <select id="tb-mahlzeit" className="input" value={mahlzeit} onChange={e => setMahlzeit(e.target.value as Mahlzeit)}>
                {MAHLZEITEN.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tb-datum">Tag</label>
              <input id="tb-datum" type="date" className="input" value={datum} max={todayISO()} onChange={e => e.target.value && setDatum(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="label">Menge</div>
            <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl border border-border mb-3" role="group" aria-label="Mengeneinheit">
              {(['portion', 'gramm'] as const).map(m => (
                <button key={m} onClick={() => wechsle(m)} aria-pressed={modus === m}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${modus === m ? 'bg-primary text-white' : 'text-text-secondary'}`}>
                  {m === 'portion' ? 'Portion' : 'Gramm'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMenge(v => Math.max(min, Math.round((v - schritt) * 100) / 100))} aria-label="Weniger"
                className="w-10 h-10 rounded-xl bg-bg-elevated border border-border flex items-center justify-center"><Minus size={16} /></button>
              <input type="number" className="input text-center" aria-label={modus === 'portion' ? 'Anzahl Portionen' : 'Menge in Gramm'}
                value={menge} min={min} step={schritt} onChange={e => setMenge(parseFloat(e.target.value) || 0)} />
              <button onClick={() => setMenge(v => Math.round((v + schritt) * 100) / 100)} aria-label="Mehr"
                className="w-10 h-10 rounded-xl bg-bg-elevated border border-border flex items-center justify-center"><Plus size={16} /></button>
              <span className="text-sm text-text-secondary w-16">{modus === 'portion' ? (menge === 1 ? 'Portion' : 'Portionen') : 'g'}</span>
            </div>
            <div className="text-[11px] text-text-muted mt-1.5">
              1 Portion ≈ {r.portionG} g (geschätzt) · gewählt: ca. {gramm} g
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 p-3 bg-bg-elevated rounded-2xl" aria-live="polite">
            {([['Kalorien', Math.round(n.kcal), 'kcal'], ['Eiweiß', n.protein, 'g'], ['Karbs', n.kh, 'g'], ['Fett', n.fett, 'g'], ['Ballast', n.ballast, 'g']] as const).map(([l, v, u]) => (
              <div key={l} className="text-center">
                <div className="text-sm font-bold text-text-primary">{zahl(v, l === 'Kalorien' ? 0 : 1)}</div>
                <div className="text-[10px] text-text-muted">{u}</div>
                <div className="text-[10px] text-text-muted">{l}</div>
              </div>
            ))}
          </div>
          {fehler && <div className="text-sm text-danger" role="alert">{fehler}</div>}
        </div>
      )}
    </Sheet>
  )
}
