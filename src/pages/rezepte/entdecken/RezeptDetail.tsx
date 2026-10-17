import { useCallback, useContext, useMemo, useState } from 'react'
import { BookPlus, ChefHat, Clock, Flame, Minus, Play, Plus, ShoppingCart, Trash2, Users, AlertTriangle } from 'lucide-react'
import type { Treffer } from '../../../lib/entdecken/filter'
import { ARTEN, GESUNDHEIT_REIHEN, REIHEN, SCHWIERIGKEIT } from '../../../lib/entdecken/katalog'
import { SCHWELLEN } from '../../../lib/entdecken/engine'
import { ZUTATEN, zutatZeile } from '../../../lib/entdecken/zutaten'
import { EinkaufKontext, FavoritHerz, Sheet, Hinweis, RezeptBild, TagChip, TeilenDruckenLeiste, gesundheitsTags, teilenMeldung, zahl } from './gemeinsam'
import { DruckAnsicht, RezeptDruck } from './Druck'
import { rezeptText, teile } from '../../../lib/entdecken/teilen'
import { pflanzeFuerKey } from '../../../lib/entdecken/pflanzen'
import { TagebuchDialog } from './TagebuchDialog'
import { KostenPrognose } from '../../../components/KostenPrognose'
import { CookMode } from '../../../components/CookMode'
import { kostenZutaten } from '../../../lib/einkauf/preise'

function NaehrZeile({ label, wert, einheit, stellen = 1, einzug = false, fett = false }: {
  label: string; wert: number; einheit: string; stellen?: number; einzug?: boolean; fett?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${einzug ? 'pl-4 text-text-secondary' : ''} ${fett ? 'font-semibold text-text-primary' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{zahl(wert, stellen)} {einheit}</span>
    </div>
  )
}

/** 0,5 → „½“, 1,5 → „1½“ */
function portionenText(n: number): string {
  const ganz = Math.floor(n)
  const halb = n - ganz >= 0.25 && n - ganz < 0.75
  const aufgerundet = n - ganz >= 0.75 ? 1 : 0
  if (halb) return ganz === 0 ? '½' : `${ganz}½`
  return String(ganz + aufgerundet)
}

export function RezeptDetail({ t, userId, onClose, onLoeschen }: {
  t: Treffer; userId: string; onClose: () => void; onLoeschen?: () => void
}) {
  const { r } = t
  const [tagebuch, setTagebuch] = useState(false)
  const [kochen, setKochen] = useState(false)
  const [wunschPortionen, setWunschPortionen] = useState(r.portionen)
  const faktor = wunschPortionen / r.portionen
  const einkauf = useContext(EinkaufKontext)
  const aufListe = einkauf.portionenAufListe(r.id)
  const [listeStatus, setListeStatus] = useState('')
  const [drucken, setDrucken] = useState(false)
  const [teilenStatus, setTeilenStatus] = useState('')
  const druckFertig = useCallback(() => setDrucken(false), [])
  const kosten = useMemo(() => kostenZutaten(r.zutaten), [r.zutaten])

  async function aufDieListe() {
    setListeStatus('')
    setListeStatus((await einkauf.hinzufuegen(r, wunschPortionen)) ? 'ok' : 'fehler')
  }
  async function teilen() {
    setTeilenStatus(teilenMeldung(await teile(r.name, rezeptText(r, wunschPortionen))))
  }
  const tags = gesundheitsTags(r)
  const arten = ARTEN.filter(a => r.arten.includes(a.id))
  const reihen = REIHEN.filter(x => r.alleReihen.includes(x.id))
  const ballastAnteil = Math.min(1, r.pro.ballast / SCHWELLEN.ballaststoffTagesziel)

  return (
    <Sheet titel={r.name} untertitel={`pro Portion · ca. ${r.portionG} g`} onClose={onClose} z={80}
      footer={
        <div className="flex gap-2">
          <button onClick={() => setTagebuch(true)} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <BookPlus size={16} /> Tagebuch
          </button>
          <FavoritHerz r={r} beschriftung className="px-4 rounded-full border border-border hover:bg-bg-elevated text-text-primary" />
          {onLoeschen && (
            <button onClick={() => { onLoeschen(); onClose() }} aria-label="Rezept löschen"
              className="p-2.5 rounded-full text-danger hover:bg-danger/10 border border-border"><Trash2 size={16} /></button>
          )}
        </div>
      }>
      <div className="space-y-5 -mx-1">
        <RezeptBild r={r} className="w-full aspect-[16/10] rounded-2xl" />

        {r.beschreibung && <p className="text-sm text-text-secondary">{r.beschreibung}</p>}

        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { icon: Flame, wert: `${Math.round(r.pro.kcal)}`, label: 'kcal' },
            { icon: Clock, wert: `${r.zeitMin}`, label: 'Minuten' },
            { icon: ChefHat, wert: SCHWIERIGKEIT[r.schwierigkeit - 1], label: 'Niveau' },
            { icon: Users, wert: `${r.portionen}`, label: r.portionen === 1 ? 'Portion' : 'Portionen' },
          ].map(({ icon: Icon, wert, label }) => (
            <div key={label} className="rounded-2xl bg-bg-elevated border border-border py-2.5 px-1">
              <Icon size={15} className="mx-auto text-brand mb-1" aria-hidden="true" />
              <div className="text-sm font-bold text-text-primary leading-tight">{wert}</div>
              <div className="text-[10px] text-text-muted">{label}</div>
            </div>
          ))}
        </div>

        <TeilenDruckenLeiste onTeilen={teilen} onDrucken={() => setDrucken(true)} status={teilenStatus} />

        {(t.konflikte?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-danger/40 bg-danger/10 p-3 text-sm flex items-start gap-2" role="alert" data-testid="konflikt-hinweis">
            <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
            <span><strong>Passt nicht zu deinen Einschränkungen:</strong> {t.konflikte!.join(', ')}. Bitte prüfe die Zutaten, bevor du es kochst.</span>
          </div>
        )}

        {(t.weich.length > 0 || t.warnungen.length > 0) && (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm space-y-1" role="note">
            {t.weich.length > 0 && (
              <div className="flex items-start gap-2"><AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                <span>Steht auf deiner „Schmeckt mir nicht“-Liste: {t.weich.join(', ')}</span></div>
            )}
            {t.warnungen.map(w => (
              <div key={w.code} className="flex items-start gap-2"><AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                <span>Laut Anamnese: {w.text}</span></div>
            ))}
            {t.warnungen.length > 0 && <Hinweis />}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {arten.map(a => (
            <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-bg-elevated border border-border px-2.5 py-1 text-xs text-text-secondary" title={a.info}>
              <span aria-hidden="true">{a.emoji}</span>{a.label}
            </span>
          ))}
          {reihen.map(x => (
            <span key={x.id} className="inline-flex items-center gap-1 rounded-full bg-brand/10 border border-brand/30 px-2.5 py-1 text-xs text-brand">
              <span aria-hidden="true">{x.emoji}</span>{x.label}
            </span>
          ))}
        </div>

        {/* Gesundheit */}
        <section aria-labelledby="gesundheit-titel" className="space-y-2">
          <h3 id="gesundheit-titel" className="text-xs font-semibold text-text-muted uppercase tracking-wide">Gesundheit</h3>
          <Hinweis lang />
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">{tags.map(tag => <TagChip key={tag.text} tag={tag} />)}</div>
          ) : (
            <div className="text-sm text-text-muted">Für dieses Rezept ergibt sich kein besonderes Gesundheits-Tag.</div>
          )}
          <div className="rounded-2xl bg-bg-elevated border border-border p-3 space-y-1.5">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Ballaststoffe vom Tagesziel</span>
              <span>{zahl(r.pro.ballast, 1)} von {SCHWELLEN.ballaststoffTagesziel} g</span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden"><div className="h-full bg-success rounded-full" style={{ width: `${ballastAnteil * 100}%` }} /></div>
            {r.pro.omega3 > 0 && (
              <div className="text-xs text-text-secondary pt-1">Omega-3 (ALA/EPA/DHA): ca. {zahl(r.pro.omega3 / 1000, 1)} g pro Portion</div>
            )}
          </div>
          {r.pflanzen.length > 0 && (
            <div className="rounded-2xl bg-bg-elevated border border-border p-3 space-y-1.5" data-testid="detail-pflanzen">
              <div className="text-xs text-text-secondary">🌱 <strong>{r.pflanzen.length} {r.pflanzen.length === 1 ? 'Pflanze' : 'verschiedene Pflanzen'}</strong> für dein Wochenziel (Schätzung)</div>
              <div className="flex flex-wrap gap-1">{r.pflanzen.map(k => <span key={k} className="rounded-full bg-success/10 border border-success/30 text-success text-[11px] px-2 py-0.5">{pflanzeFuerKey(k)?.name ?? k}</span>)}</div>
            </div>
          )}
          <details className="text-xs text-text-muted">
            <summary className="cursor-pointer">So wird gerechnet</summary>
            <ul className="mt-1.5 space-y-1 list-disc pl-4">
              {Object.values(GESUNDHEIT_REIHEN).map(g => <li key={g.label}><strong className="text-text-secondary">{g.label}:</strong> {g.info}</li>)}
            </ul>
          </details>
        </section>

        {/* Zutaten mit Portionsregler */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Zutaten</h3>
          <div className="flex items-center gap-2 rounded-2xl bg-bg-elevated border border-border p-2.5" role="group" aria-label="Portionsregler">
            <span className="text-sm text-text-secondary flex-1 pl-1">Für</span>
            <button onClick={() => setWunschPortionen(p => Math.max(0.5, p - 0.5))} disabled={wunschPortionen <= 0.5} aria-label="Weniger Portionen"
              className="w-9 h-9 rounded-xl bg-bg-card border border-border flex items-center justify-center disabled:opacity-40"><Minus size={14} /></button>
            <span className="w-24 text-center font-semibold text-text-primary tabular-nums" aria-live="polite" data-testid="portionen-anzeige">
              {portionenText(wunschPortionen)} {wunschPortionen === 1 ? 'Portion' : 'Portionen'}
            </span>
            <button onClick={() => setWunschPortionen(p => Math.min(24, p + 0.5))} disabled={wunschPortionen >= 24} aria-label="Mehr Portionen"
              className="w-9 h-9 rounded-xl bg-bg-card border border-border flex items-center justify-center disabled:opacity-40"><Plus size={14} /></button>
          </div>
          {faktor !== 1 && (
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Rezept ist für {r.portionen} {r.portionen === 1 ? 'Portion' : 'Portionen'} gedacht. Nährwerte gelten weiter pro Portion.</span>
              <button onClick={() => setWunschPortionen(r.portionen)} className="text-brand hover:underline shrink-0 ml-2">Zurücksetzen</button>
            </div>
          )}
          <ul className="rounded-2xl bg-bg-elevated border border-border divide-y divide-border">
            {r.zutaten.map((z, i) => {
              const zt = ZUTATEN[z.id]
              return zt ? <li key={i} className="px-3 py-2 text-sm text-text-primary">{zutatZeile(zt, z.g * faktor)}</li> : null
            })}
          </ul>
          <KostenPrognose kosten={kosten} rezeptPortionen={r.portionen} portionen={wunschPortionen} />
          <button onClick={aufDieListe} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
            <ShoppingCart size={15} />
            {aufListe === null ? 'Auf die Einkaufsliste' : aufListe === wunschPortionen ? 'Schon auf der Einkaufsliste' : `Einkaufsliste auf ${portionenText(wunschPortionen)} Port. ändern`}
          </button>
          {listeStatus === 'ok' && (
            <div className="text-xs text-success flex items-center justify-between" role="status">
              <span>Auf der Einkaufsliste für {portionenText(wunschPortionen)} {wunschPortionen === 1 ? 'Portion' : 'Portionen'}.</span>
              <button onClick={einkauf.oeffneListe} className="text-brand hover:underline">Liste ansehen</button>
            </div>
          )}
          {listeStatus === 'fehler' && <div className="text-xs text-danger" role="alert">Das hat nicht geklappt. Bitte versuche es noch einmal.</div>}
        </section>

        {/* Anleitung */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Anleitung</h3>
          <ol className="space-y-2.5 rounded-2xl bg-bg-elevated border border-border p-3">
            {r.schritte.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
                <span className="w-6 h-6 rounded-full bg-brand/15 text-brand text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {r.schritte.length > 0 && (
            <button onClick={() => setKochen(true)} className="btn-primary w-full flex items-center justify-center gap-2">
              <Play size={16} /> Kochmodus starten
            </button>
          )}
        </section>

        {/* Nährstoffe */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Nährwerte pro Portion</h3>
          <div className="rounded-2xl bg-bg-elevated border border-border px-3 py-1 divide-y divide-border">
            <NaehrZeile label="Kalorien" wert={r.pro.kcal} einheit="kcal" stellen={0} fett />
            <NaehrZeile label="Eiweiß" wert={r.pro.protein} einheit="g" fett />
            <div>
              <NaehrZeile label="Kohlenhydrate" wert={r.pro.kh} einheit="g" fett />
              <NaehrZeile label="davon Ballaststoffe" wert={r.pro.ballast} einheit="g" einzug />
              <NaehrZeile label="davon Zucker" wert={r.pro.zucker} einheit="g" einzug />
            </div>
            <div>
              <NaehrZeile label="Fett" wert={r.pro.fett} einheit="g" fett />
              <NaehrZeile label="gesättigte Fettsäuren" wert={r.pro.gesaettigt} einheit="g" einzug />
              <NaehrZeile label="einfach ungesättigte Fettsäuren" wert={r.pro.einfach} einheit="g" einzug />
              <NaehrZeile label="mehrfach ungesättigte Fettsäuren" wert={r.pro.mehrfach} einheit="g" einzug />
            </div>
            <NaehrZeile label="Cholesterin" wert={r.pro.cholesterin} einheit="mg" stellen={0} />
            <NaehrZeile label="Natrium" wert={r.pro.natrium} einheit="mg" stellen={0} />
            <NaehrZeile label="Salz" wert={r.pro.salz} einheit="g" />
            <NaehrZeile label="Kalium" wert={r.pro.kalium} einheit="mg" stellen={0} />
          </div>
          <p className="text-[11px] text-text-muted">Geschätzt aus Durchschnittswerten der Zutaten (rohes Gewicht, ohne Garverluste). Kohlenhydrate inklusive Ballaststoffe.</p>
        </section>
      </div>
      {drucken && <DruckAnsicht onFertig={druckFertig}><RezeptDruck r={r} portionen={wunschPortionen} /></DruckAnsicht>}
      {tagebuch && <TagebuchDialog r={r} userId={userId} onClose={() => setTagebuch(false)} />}
      {kochen && (
        <CookMode title={r.name} steps={r.schritte}
          ingredients={r.zutaten.flatMap(z => (ZUTATEN[z.id] ? [zutatZeile(ZUTATEN[z.id], z.g * faktor)] : []))}
          onClose={() => setKochen(false)} />
      )}
    </Sheet>
  )
}
