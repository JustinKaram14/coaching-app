import { useState } from 'react'
import { Sparkles, Check } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Spinner } from '../../../components/ui/Spinner'
import { Sheet, Hinweis } from './gemeinsam'
import { Chip } from './FilterSheet'
import { ARTEN } from '../../../lib/entdecken/katalog'
import { berechneRezept } from '../../../lib/entdecken/engine'
import { ausschlussTrifft, type AnamneseProfil } from '../../../lib/entdecken/filter'
import { bereinigeDef } from '../../../lib/entdecken/daten'
import { ZUTATEN } from '../../../lib/entdecken/zutaten'
import { MAHLZEITEN, type Ausschluss, type Ernaehrungsart, type Mahlzeit, type Rezept, type RezeptDef } from '../../../lib/entdecken/types'

type Phase = 'form' | 'rezept' | 'bild' | 'fertig'

async function fehlerText(data: { error?: string } | null, fnErr: unknown): Promise<string> {
  if (data?.error) return data.error
  const ctx = (fnErr as { context?: unknown } | null)?.context
  if (ctx instanceof Response) return (await ctx.json().catch(() => null))?.error ?? ''
  return ''
}

/** Lässt die KI ein neues Rezept aus der Zutaten-Datenbank zusammenstellen und ein Foto dazu erzeugen */
export function KiDialog({ ausschluesse, anamnese, onFertig, onClose, speichern }: {
  ausschluesse: Ausschluss[]
  anamnese: AnamneseProfil | null
  onFertig: (id: string) => void
  onClose: () => void
  speichern: (def: RezeptDef, bildUrl: string | null) => Promise<string | null>
}) {
  const [mahlzeit, setMahlzeit] = useState<Mahlzeit>('Mittagessen')
  const [arten, setArten] = useState<Ernaehrungsart[]>([])
  const [maxKcal, setMaxKcal] = useState('')
  const [wunsch, setWunsch] = useState('')
  const [beruecksichtigen, setBeruecksichtigen] = useState(true)
  const [phase, setPhase] = useState<Phase>('form')
  const [fehler, setFehler] = useState('')
  const [hinweis, setHinweis] = useState('')
  const [neuId, setNeuId] = useState<string | null>(null)

  const hart = ausschluesse.filter(a => a.art === 'hart').map(a => a.begriff)
  const weich = ausschluesse.filter(a => a.art === 'weich').map(a => a.begriff)
  const anamneseHart = anamnese?.harte.map(h => h.label) ?? []

  async function erzeugen() {
    setFehler(''); setHinweis('')
    setPhase('rezept')
    const meiden = beruecksichtigen ? [...new Set([...hart, ...anamneseHart])] : []
    const ungern = beruecksichtigen ? weich : []
    let rezept: Rezept | null = null
    let definition: RezeptDef | null = null
    let letzterGrund = ''

    for (let versuch = 0; versuch < 3 && !rezept; versuch++) {
      const { data, error } = await supabase.functions.invoke('generate-entdecken-rezept', {
        body: {
          mahlzeit, arten, maxKcal: maxKcal ? Number(maxKcal) : undefined, wunsch: wunsch.trim() || undefined,
          meiden, ungern,
        },
      })
      if (error || data?.error || !data?.rezept) {
        letzterGrund = (await fehlerText(data, error)) || 'Die KI hat gerade nicht geantwortet.'
        continue
      }
      const def = bereinigeDef({ ...data.rezept, mahlzeiten: data.rezept.mahlzeiten?.length ? data.rezept.mahlzeiten : [mahlzeit] }, crypto.randomUUID())
      if (!def) { letzterGrund = 'Das Rezept der KI war unvollständig.'; continue }
      const berechnet = berechneRezept(def)
      // Nicht vertrauen, sondern nachrechnen: Ernährungsart und Einschränkungen müssen wirklich passen
      const fehlt = arten.find(a => !berechnet.arten.includes(a))
      if (fehlt) { letzterGrund = `Das Rezept erfüllte „${ARTEN.find(a => a.id === fehlt)?.label}“ nicht und wurde verworfen.`; continue }
      if (maxKcal && berechnet.pro.kcal > Number(maxKcal) * 1.05) { letzterGrund = `Das Rezept hatte mehr als ${maxKcal} kcal und wurde verworfen.`; continue }
      if (meiden.some(b => ausschlussTrifft(berechnet, b))) { letzterGrund = 'Das Rezept enthielt etwas aus deiner Ausschlussliste und wurde verworfen.'; continue }
      rezept = berechnet
      definition = def
    }
    if (!rezept || !definition) { setFehler(`${letzterGrund} Bitte versuche es noch einmal.`); setPhase('form'); return }

    setPhase('bild')
    let bildUrl: string | null = null
    const { data: bild, error: bildFehler } = await supabase.functions.invoke('generate-entdecken-bild', {
      body: {
        modus: 'ki', id: rezept.id, name: rezept.name,
        zutaten: rezept.zutaten.map(z => ZUTATEN[z.id]?.name).filter(Boolean).slice(0, 8), mahlzeit,
      },
    })
    if (bildFehler || bild?.error || !bild?.bildUrl) setHinweis('Das Foto konnte gerade nicht erstellt werden. Das Rezept ist trotzdem gespeichert.')
    else bildUrl = bild.bildUrl as string

    const gespeichert = await speichern(definition, bildUrl)
    if (!gespeichert) { setFehler('Das Rezept konnte nicht gespeichert werden.'); setPhase('form'); return }
    setNeuId(gespeichert)
    setPhase('fertig')
  }

  const laeuft = phase === 'rezept' || phase === 'bild'

  return (
    <Sheet titel="Neues Rezept per KI" untertitel="Die KI wählt aus meiner Zutaten-Datenbank, Nährwerte rechnet die App nach" onClose={laeuft ? () => {} : onClose}
      footer={phase === 'fertig' ? (
        <div className="flex gap-2">
          <button onClick={() => { if (neuId) onFertig(neuId); onClose() }} className="btn-primary flex-1">Rezept ansehen</button>
          <button onClick={onClose} className="btn-secondary">Schließen</button>
        </div>
      ) : (
        <button onClick={erzeugen} disabled={laeuft} className="btn-primary w-full flex items-center justify-center gap-2">
          {laeuft ? <Spinner size={16} /> : <Sparkles size={16} />}
          {phase === 'rezept' ? 'KI schreibt das Rezept…' : phase === 'bild' ? 'KI erstellt das Foto…' : 'Rezept erzeugen'}
        </button>
      )}>
      {phase === 'fertig' ? (
        <div className="text-center py-6 space-y-2" role="status">
          <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto"><Check size={24} /></div>
          <div className="font-semibold text-text-primary">Dein Rezept ist fertig</div>
          {hinweis && <div className="text-xs text-warning">{hinweis}</div>}
        </div>
      ) : (
        <fieldset disabled={laeuft} className="space-y-5 border-0 p-0 m-0 min-w-0">
          <div>
            <label className="label" htmlFor="ki-mahlzeit">Mahlzeit</label>
            <select id="ki-mahlzeit" className="input" value={mahlzeit} onChange={e => setMahlzeit(e.target.value as Mahlzeit)}>
              {MAHLZEITEN.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div className="label">Ernährungsart (optional)</div>
            <div className="flex flex-wrap gap-2">
              {ARTEN.map(a => <Chip key={a.id} aktiv={arten.includes(a.id)} onClick={() => setArten(l => (l.includes(a.id) ? l.filter(x => x !== a.id) : [...l, a.id]))}>{a.emoji} {a.label}</Chip>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ki-kcal">Höchstens kcal pro Portion</label>
              <input id="ki-kcal" type="number" className="input" placeholder="z. B. 500" min={50} max={1500} value={maxKcal} onChange={e => setMaxKcal(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ki-wunsch">Wunsch oder Idee (optional)</label>
            <input id="ki-wunsch" className="input" maxLength={120} placeholder="z. B. mit Lachs, ohne Backen, asiatisch" value={wunsch} onChange={e => setWunsch(e.target.value)} />
          </div>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={beruecksichtigen} onChange={e => setBeruecksichtigen(e.target.checked)} className="mt-1 w-5 h-5 accent-[rgb(var(--c-brand))] shrink-0" />
            <span className="text-sm text-text-secondary">
              Meine Einschränkungen berücksichtigen
              {(hart.length + anamneseHart.length + weich.length) > 0 && <span className="block text-xs text-text-muted">
                {[...new Set([...hart, ...anamneseHart])].join(', ') || 'keine harten Ausschlüsse'}{weich.length > 0 && ` · ungern: ${weich.join(', ')}`}
              </span>}
            </span>
          </label>
          <Hinweis lang />
          {fehler && <div className="text-sm text-danger" role="alert">{fehler}</div>}
        </fieldset>
      )}
    </Sheet>
  )
}
