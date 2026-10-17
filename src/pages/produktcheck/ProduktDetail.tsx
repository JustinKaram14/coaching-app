import { useEffect, useState } from 'react'
import {
  AlertTriangle, Apple, ArrowLeft, Candy, ChevronDown, ChevronRight, Droplet, ExternalLink, FileSearch, Flame, FlaskConical,
  Leaf, Plus, Shell, Star, Wheat, Beef, Info,
} from 'lucide-react'
import { FARBEN, RISIKO_FARBEN, type Bewertung, type Merkmal, type Produkt } from '../../lib/produktcheck/bewertung'
import { FUNKTIONEN, RISIKEN, STUFEN, type Zusatzstoff } from '../../lib/produktcheck/zusatzstoffe'
import { ladeAlternativen, type Alternative, type Warnung } from '../../lib/produktcheck/produkt'
import { Spinner } from '../../components/ui/Spinner'

const ICONS: Record<Merkmal['id'], typeof Leaf> = {
  bio: Leaf, obst: Apple, ballast: Wheat, protein: Beef, kcal: Flame, zucker: Candy, gesaettigt: Droplet, salz: Shell, zusatzstoffe: FlaskConical,
}

export function Punkt({ farbe, size = 12, risiko }: { farbe: number; size?: number; risiko?: boolean }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: (risiko ? RISIKO_FARBEN : FARBEN)[farbe] }} aria-hidden="true" />
}

export function Punktzahl({ bewertung, gross }: { bewertung: Bewertung; gross?: boolean }) {
  if (bewertung.punkte == null || !bewertung.stufe) return <span className="text-sm text-text-muted">Nicht bewertbar (Nährwerte fehlen)</span>
  return (
    <span className="flex items-center gap-2">
      <Punkt farbe={bewertung.stufe.farbe} size={gross ? 18 : 12} />
      <span>
        <span className={`block font-bold text-text-primary tabular-nums ${gross ? 'text-2xl' : 'text-base'}`}>{bewertung.punkte}/100</span>
        <span className="block text-xs text-text-muted">{bewertung.stufe.label}</span>
      </span>
    </span>
  )
}

function Skala({ m }: { m: Merkmal }) {
  if (!m.skala || m.wert == null) return null
  const { grenzen, farben } = m.skala
  const max = grenzen.at(-1)!
  const pos = Math.min(100, Math.max(0, (m.wert / max) * 100))
  return (
    <div className="mt-3 mb-1">
      <div className="relative h-3">
        <span className="absolute -top-0.5 -translate-x-1/2 text-[10px] leading-none" style={{ left: `${pos}%`, color: FARBEN[m.farbe] }}>▼</span>
      </div>
      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
        {farben.map((f, i) => (
          <span key={i} style={{ flex: grenzen[i + 1] - grenzen[i], background: FARBEN[f] }} />
        ))}
      </div>
      <div className="relative h-4 mt-1 text-[10px] text-text-muted tabular-nums">
        {grenzen.map((g, i) => (
          <span key={i} className="absolute -translate-x-1/2" style={{ left: `${(g / max) * 100}%` }}>{String(g).replace('.', ',')}</span>
        ))}
      </div>
    </div>
  )
}

function MerkmalZeile({ m, zusatz, onZusatzstoffe }: { m: Merkmal; zusatz: Bewertung['zusatzstoffe']; onZusatzstoffe: () => void }) {
  const [offen, setOffen] = useState(false)
  const Icon = ICONS[m.id]
  const aufklappbar = !!m.skala || (m.id === 'zusatzstoffe' && zusatz.length > 0)
  const zaehler = [3, 2, 1, 0].map(s => ({ stufe: s, anzahl: zusatz.filter(z => z.stufe === s).length })).filter(z => z.anzahl > 0)
  return (
    <li className="py-3 border-b border-border last:border-0">
      <button className="w-full flex items-center gap-3 text-left" onClick={() => aufklappbar && setOffen(o => !o)} aria-expanded={aufklappbar ? offen : undefined}>
        <Icon size={22} className="text-text-muted shrink-0" strokeWidth={1.5} />
        <span className="flex-1 min-w-0">
          <span className="block font-medium text-text-primary">{m.titel}</span>
          <span className="block text-xs text-text-muted">{m.text}</span>
        </span>
        {m.id === 'bio' ? <span className="text-success text-lg" aria-label="ja">✓</span> : (
          <>
            {m.wert != null && <span className="text-sm text-text-secondary tabular-nums">{String(m.wert).replace('.', ',')}{m.einheit && m.einheit !== '%' ? ` ${m.einheit}` : m.einheit ?? ''}</span>}
            <Punkt farbe={m.farbe} risiko={m.id === 'zusatzstoffe'} />
            {aufklappbar && <ChevronDown size={16} className={`text-text-muted transition-transform ${offen ? 'rotate-180' : ''}`} />}
          </>
        )}
      </button>
      {offen && m.id !== 'zusatzstoffe' && <div className="pl-9"><Skala m={m} /></div>}
      {offen && m.id === 'zusatzstoffe' && (
        <div className="pl-9 pt-2 space-y-1.5">
          {zaehler.map(z => (
            <div key={z.stufe} className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="w-5 h-5 rounded-full text-[11px] font-bold text-white flex items-center justify-center" style={{ background: RISIKO_FARBEN[z.stufe] }}>{z.anzahl}</span>
              {STUFEN[z.stufe].label}
            </div>
          ))}
          <button onClick={onZusatzstoffe} className="flex items-center gap-1.5 text-sm text-brand font-medium pt-1">
            <Info size={15} /> Mehr über die Zusatzstoffe
          </button>
        </div>
      )}
    </li>
  )
}

type Ansicht = { art: 'detail' } | { art: 'zusatzstoffe' } | { art: 'zusatzstoff'; code: string } | { art: 'quellen'; code: string } | { art: 'methodik' }

interface Props {
  produkt: Produkt
  bewertung: Bewertung
  offline?: boolean
  warnungen: Warnung[]
  favorit?: boolean
  onFavorit?: () => void
  onTagebuch?: () => void
  onAlternative?: (barcode: string) => void
}

export function ProduktDetail({ produkt, bewertung, offline, warnungen, favorit, onFavorit, onTagebuch, onAlternative }: Props) {
  const [ansicht, setAnsicht] = useState<Ansicht>({ art: 'detail' })
  const [alternativen, setAlternativen] = useState<Alternative[] | null>(null)

  useEffect(() => {
    setAnsicht({ art: 'detail' })
    setAlternativen(null)
    if (bewertung.punkte != null && bewertung.punkte < 75 && produkt.kategorien.length) {
      ladeAlternativen(produkt, bewertung.punkte).then(setAlternativen).catch(() => setAlternativen([]))
    } else setAlternativen([])
  }, [produkt, bewertung.punkte])

  const zurueck = (ziel: Ansicht) => (
    <button onClick={() => setAnsicht(ziel)} className="flex items-center gap-1 text-sm text-text-secondary mb-3"><ArrowLeft size={16} /> Zurück</button>
  )

  if (ansicht.art === 'methodik') return <div>{zurueck({ art: 'detail' })}<Methodik /></div>

  if (ansicht.art === 'zusatzstoffe') {
    return (
      <div>
        {zurueck({ art: 'detail' })}
        <h3 className="font-bold text-text-primary mb-3">Zusatzstoffe</h3>
        <ul className="rounded-2xl bg-bg-elevated divide-y divide-border">
          {bewertung.zusatzstoffe.map(z => (
            <li key={z.code}>
              <button onClick={() => setAnsicht({ art: 'zusatzstoff', code: z.code })} className="w-full flex items-center gap-3 p-3 text-left">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-text-primary">{z.code.toUpperCase()}</span>
                  <span className="block text-sm text-text-secondary truncate">{z.name}</span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-bg-card text-[11px] font-semibold text-text-muted">{FUNKTIONEN[z.funktion].label}</span>
                </span>
                <span className="text-xs text-text-muted text-right">{z.bekannt ? STUFEN[z.stufe].label : 'Nicht bewertet'}</span>
                <Punkt farbe={z.stufe} risiko />
                <ChevronRight size={16} className="text-text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (ansicht.art === 'zusatzstoff' || ansicht.art === 'quellen') {
    const z = bewertung.zusatzstoffe.find(x => x.code === ansicht.code) as Zusatzstoff & { bekannt: boolean }
    if (ansicht.art === 'quellen') {
      const quellen = [...new Map(z.risiken.flatMap(r => RISIKEN[r].quellen).map(q => [q.url + q.titel, q])).values()]
      return (
        <div>
          {zurueck({ art: 'zusatzstoff', code: z.code })}
          <h3 className="font-bold text-text-primary mb-3">{z.name}: Quellen</h3>
          <ul className="space-y-4">
            {quellen.map(q => (
              <li key={q.url + q.titel} className="border-b border-border pb-3">
                <div className="font-semibold text-text-primary">{q.herausgeber}, {q.jahr}</div>
                <div className="text-sm text-text-secondary mt-1">{q.titel}</div>
                <a href={q.url} target="_blank" rel="noreferrer" className="text-xs text-brand break-all inline-flex items-center gap-1 mt-1">{q.url} <ExternalLink size={11} /></a>
              </li>
            ))}
          </ul>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        {zurueck({ art: 'zusatzstoffe' })}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-text-primary">{z.name}</h3>
            <div className="flex items-center gap-2 mt-1 text-text-secondary"><Punkt farbe={z.stufe} risiko /> {z.bekannt ? STUFEN[z.stufe].label : 'Noch nicht bewertet'}</div>
          </div>
          <span className="px-3 py-1 rounded-full bg-bg-elevated text-sm font-semibold text-text-secondary">{z.code.toUpperCase()}</span>
        </div>
        <div className="rounded-2xl bg-bg-elevated p-3">
          <div className="font-semibold text-text-primary">{FUNKTIONEN[z.funktion].label}</div>
          <div className="text-sm text-text-muted">{FUNKTIONEN[z.funktion].text}</div>
        </div>
        {z.risiken.length > 0 && (
          <div>
            <h4 className="font-semibold text-text-primary text-sm mb-2">Mögliche Risiken</h4>
            <div className="grid grid-cols-2 gap-2">
              {z.risiken.map(r => <div key={r} className="rounded-2xl bg-bg-elevated p-3 text-sm text-center text-text-primary">{RISIKEN[r].label}</div>)}
            </div>
          </div>
        )}
        <div className="text-sm text-text-secondary space-y-2 leading-relaxed">
          {z.text && <p>{z.text}</p>}
          {z.risiken.map(r => <p key={r}>{RISIKEN[r].text}</p>)}
          {!z.text && !z.risiken.length && <p>{z.bekannt ? 'Nach aktuellem Kenntnisstand bei üblicher Aufnahme unbedenklich.' : 'Für diesen Zusatzstoff liegt noch keine Einstufung vor; er fließt nicht in die Bewertung ein.'}</p>}
        </div>
        <div className="divide-y divide-border border-t border-border">
          {z.risiken.length > 0 && <button onClick={() => setAnsicht({ art: 'quellen', code: z.code })} className="w-full text-left py-3 text-brand text-sm">Wissenschaftliche Quellen</button>}
          <button onClick={() => setAnsicht({ art: 'methodik' })} className="w-full text-left py-3 text-brand text-sm">Methodik</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-2">
      <div className="flex gap-4">
        {produkt.bild
          ? <img src={produkt.bild} alt="" className="w-24 h-24 rounded-2xl object-contain bg-white shrink-0" />
          : <div className="w-24 h-24 rounded-2xl bg-bg-elevated shrink-0" />}
        <div className="min-w-0 space-y-2">
          <div>
            <h3 className="text-lg font-bold text-text-primary leading-tight">{produkt.name}</h3>
            {produkt.marke && <div className="text-sm text-text-muted">{produkt.marke}{produkt.menge ? ` · ${produkt.menge}` : ''}</div>}
          </div>
          <Punktzahl bewertung={bewertung} gross />
        </div>
      </div>

      {warnungen.length > 0 && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3 space-y-1">
          {warnungen.map(w => (
            <div key={w.label} className={`flex items-center gap-2 text-sm font-medium ${w.art === 'enthaelt' ? 'text-danger' : 'text-warning'}`}>
              <AlertTriangle size={15} /> {w.label}
            </div>
          ))}
        </div>
      )}
      {offline && <p className="text-xs text-text-muted">Ohne Verbindung zu Open Food Facts: Allergene und Zutaten konnten nicht geprüft werden.</p>}

      {(['positiv', 'negativ'] as const).map(seite => bewertung[seite].length > 0 && (
        <section key={seite}>
          <div className="flex items-baseline justify-between">
            <h4 className="text-lg font-bold text-text-primary">{seite === 'positiv' ? 'Positiv' : 'Negativ'}</h4>
            <span className="text-xs text-text-muted">pro 100 {produkt.getraenk ? 'ml' : 'g'}</span>
          </div>
          <ul>
            {bewertung[seite].map(m => <MerkmalZeile key={m.id} m={m} zusatz={bewertung.zusatzstoffe} onZusatzstoffe={() => setAnsicht({ art: 'zusatzstoffe' })} />)}
          </ul>
        </section>
      ))}

      {alternativen === null && <div className="flex justify-center"><Spinner /></div>}
      {alternativen && alternativen.length > 0 && (
        <section>
          <h4 className="text-lg font-bold text-text-primary mb-2">Bessere Alternativen</h4>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {alternativen.map(a => (
              <button key={a.produkt.barcode} onClick={() => onAlternative?.(a.produkt.barcode)} className="w-32 shrink-0 rounded-2xl bg-bg-elevated p-2 text-left">
                {a.produkt.bild ? <img src={a.produkt.bild} alt="" className="w-full h-24 object-contain rounded-xl bg-white" /> : <div className="w-full h-24 rounded-xl bg-bg-card" />}
                <div className="text-xs font-semibold text-text-primary mt-2 line-clamp-2">{a.produkt.name}</div>
                {a.produkt.marke && <div className="text-[11px] text-text-muted truncate">{a.produkt.marke}</div>}
                <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-text-primary"><Punkt farbe={a.punkte >= 75 ? 0 : a.punkte >= 50 ? 1 : a.punkte >= 25 ? 2 : 3} size={9} />{a.punkte}/100</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-bg-elevated divide-y divide-border">
        {onTagebuch && <button onClick={onTagebuch} className="w-full flex items-center justify-between p-3 text-sm text-text-primary">Zum Ernährungstagebuch hinzufügen <Plus size={18} /></button>}
        {onFavorit && <button onClick={onFavorit} className="w-full flex items-center justify-between p-3 text-sm text-text-primary">{favorit ? 'Aus den Favoriten entfernen' : 'Zu den Favoriten hinzufügen'} <Star size={18} className={favorit ? 'fill-current text-warning' : ''} /></button>}
        <button onClick={() => setAnsicht({ art: 'methodik' })} className="w-full flex items-center justify-between p-3 text-sm text-text-primary">Bewertungsmethode <FileSearch size={18} /></button>
        <a href={`https://world.openfoodfacts.org/product/${produkt.barcode}`} target="_blank" rel="noreferrer" className="w-full flex items-center justify-between p-3 text-sm text-text-primary">Fehler im Produkt melden (Open Food Facts) <ExternalLink size={16} /></a>
      </section>
    </div>
  )
}

export function Methodik() {
  return (
    <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
      <h3 className="text-lg font-bold text-text-primary">So bewertet der Produkt-Check</h3>
      <p>Jedes Produkt erhält 0 bis 100 Punkte aus drei Teilen:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-text-primary">Nährwertqualität (60 %)</strong>: berechnet wie der Nutri-Score aus Kalorien, Zucker, gesättigten Fettsäuren und Salz (ungünstig) sowie Ballaststoffen, Protein und Obst-/Gemüseanteil (günstig). Getränke haben eigene Grenzwerte.</li>
        <li><strong className="text-text-primary">Zusatzstoffe (30 %)</strong>: kein Risiko 0, begrenztes Risiko −6, mäßiges Risiko −15, hohes Risiko −30 Punkte je Zusatzstoff. Bei einem Zusatzstoff mit hohem Risiko beträgt die Gesamtnote höchstens 49.</li>
        <li><strong className="text-text-primary">Bio (10 %)</strong>: für Produkte aus biologischer Landwirtschaft.</li>
      </ul>
      <p>Ab 75 Punkten „Ausgezeichnet“, ab 50 „Gut“, ab 25 „Mäßig“, darunter „Schlecht“.</p>
      <h4 className="font-semibold text-text-primary pt-2">Einstufung der Zusatzstoffe</h4>
      <p>Die Risikostufen sind eine eigene, vorsorgliche Einschätzung. Grundlage sind Bewertungen der Europäischen Behörde für Lebensmittelsicherheit (EFSA), Einstufungen der Internationalen Krebsforschungsagentur (IARC) und größere wissenschaftliche Studien. Zugelassene Zusatzstoffe gelten in den erlaubten Mengen behördlich als sicher; die Einstufung zeigt, wo es begründete Zweifel oder Hinweise auf Risiken gibt.</p>
      <h4 className="font-semibold text-text-primary pt-2">Datenquellen</h4>
      <p>Produktdaten von Open Food Facts (Open Database License), Grundnahrungsmittel aus dem Bundeslebensmittelschlüssel 4.0 (Max Rubner-Institut). Angaben können unvollständig oder veraltet sein. Der Produkt-Check ersetzt keine ärztliche oder ernährungsfachliche Beratung.</p>
    </div>
  )
}
