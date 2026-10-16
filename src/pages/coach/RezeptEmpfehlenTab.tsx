import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Check, Search, Send, Trash2, AlertTriangle } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { sendPushToUser } from '../../lib/push'
import { useCoachEmpfehlungen } from '../../lib/entdecken/empfehlungen'
import { STARTBIBLIOTHEK } from '../../lib/entdecken/daten'
import { bewerte, leseAnamnese, normalisiere } from '../../lib/entdecken/filter'
import { ARTEN } from '../../lib/entdecken/katalog'
import { MAHLZEITEN, type Mahlzeit } from '../../lib/entdecken/types'
import { ZUTATEN, zutatZeile } from '../../lib/entdecken/zutaten'
import { RezeptBild, zahl } from '../rezepte/entdecken/gemeinsam'
import type { ClientSettings } from '../../types/database'

const SEITE = 20

function datumKurz(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** Coach: Rezepte aus der Startbibliothek an einen Klienten empfehlen */
export function RezeptEmpfehlenTab({ clientId, clientName, coachName, settings }: {
  clientId: string; clientName: string; coachName: string; settings: ClientSettings | null
}) {
  const { liste, bereit, fehlt, empfehlen, loeschen } = useCoachEmpfehlungen(clientId)
  const [suche, setSuche] = useState('')
  const [mahlzeit, setMahlzeit] = useState<Mahlzeit | null>(null)
  const [nurPassend, setNurPassend] = useState(true)
  const [offen, setOffen] = useState<string | null>(null)
  const [notiz, setNotiz] = useState('')
  const [sendet, setSendet] = useState(false)
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)
  const [anzahl, setAnzahl] = useState(SEITE)

  // Allergien und Diagnosen aus der Anamnese des Klienten (die private Ausschlussliste des Klienten sieht der Coach nicht)
  const profil = useMemo(() => {
    try {
      const j = settings?.ernaehrungs_notizen ? JSON.parse(settings.ernaehrungs_notizen) as Record<string, unknown> : {}
      return leseAnamnese(typeof j.allergien === 'string' ? j.allergien : '', typeof j.erkrankungen === 'string' ? j.erkrankungen : '')
    } catch { return leseAnamnese('', '') }
  }, [settings?.ernaehrungs_notizen])

  const bewertet = useMemo(() => STARTBIBLIOTHEK.map(r => bewerte(r, { ausschluesse: [], anamnese: profil })), [profil])
  const gefiltert = useMemo(() => {
    const q = normalisiere(suche)
    return bewertet.filter(t =>
      (!q || q.split(/\s+/).every(w => normalisiere(t.r.suchtext).includes(w)))
      && (!mahlzeit || t.r.mahlzeiten.includes(mahlzeit))
      && (!nurPassend || (t.konflikte?.length ?? 0) === 0))
  }, [bewertet, suche, mahlzeit, nurPassend])
  const verborgen = bewertet.filter(t => (t.konflikte?.length ?? 0) > 0).length
  const bereitsEmpfohlen = new Map(liste.map(e => [e.rezeptId, e]))

  async function senden(rezeptId: string, name: string) {
    setSendet(true); setMeldung(null)
    const ok = await empfehlen(rezeptId, name, notiz)
    if (!ok) { setSendet(false); setMeldung({ art: 'fehler', text: 'Das Senden hat nicht geklappt. Bitte versuche es noch einmal.' }); return }
    let push = false
    try { const res = await sendPushToUser(clientId, 'Neue Rezept-Empfehlung 🍽️', `${coachName}: ${name}`, undefined); push = !!res?.data?.sent } catch { /* Push ist nur ein Zusatz */ }
    setSendet(false); setNotiz(''); setOffen(null)
    setMeldung({ art: 'ok', text: `„${name}“ ist bei ${clientName} angekommen${push ? ' (Push-Nachricht gesendet)' : ' (keine Push-Nachricht möglich, der Klient sieht es in der App)'}.` })
  }

  return (
    <div className="space-y-5">
      {fehlt && <div className="card text-sm text-warning">Die Datenbank-Tabelle für Empfehlungen fehlt noch. Bitte die Migration einspielen.</div>}

      <div className="card space-y-2">
        <h3 className="font-semibold text-text-primary">Einschränkungen von {clientName}</h3>
        {profil.leer ? (
          <p className="text-sm text-text-muted">In der Anamnese stehen keine Allergien oder Diagnosen. Eigene Ausschlüsse des Klienten in der App siehst du nicht.</p>
        ) : (
          <div className="text-sm space-y-1" data-testid="coach-anamnese">
            <div><span className="text-text-muted">Allergien/Unverträglichkeiten: </span>{profil.harte.length ? profil.harte.map(h => h.label).join(', ') : 'keine erkannt'}</div>
            <div><span className="text-text-muted">Diagnosen: </span>{profil.diagnosen.length ? profil.diagnosen.map(d => d.label).join(', ') : 'keine erkannt'}</div>
            {profil.unbekannt.length > 0 && <div className="text-xs text-text-muted">Nicht zugeordnet: {profil.unbekannt.join(', ')}</div>}
            <p className="text-xs text-text-muted">Eigene Ausschlüsse des Klienten in der App siehst du nicht. Der Klient sieht bei jedem empfohlenen Rezept selbst, ob es zu seinen Einschränkungen passt.</p>
          </div>
        )}
      </div>

      {meldung && (
        <div role={meldung.art === 'ok' ? 'status' : 'alert'} className={`rounded-2xl border px-4 py-3 text-sm flex items-start gap-2 ${meldung.art === 'ok' ? 'border-success/40 bg-success/10 text-text-primary' : 'border-danger/40 bg-danger/10 text-danger'}`}>
          {meldung.art === 'ok' && <Check size={16} className="text-success shrink-0 mt-0.5" />}{meldung.text}
        </div>
      )}

      {/* Bisherige Empfehlungen */}
      <section aria-label="Bisherige Empfehlungen" className="card space-y-2">
        <h3 className="font-semibold text-text-primary">Bisherige Empfehlungen</h3>
        {!bereit ? <Spinner size={18} /> : liste.length === 0 ? (
          <p className="text-sm text-text-muted">Noch nichts empfohlen.</p>
        ) : (
          <ul className="divide-y divide-border" data-testid="coach-liste">
            {liste.map(e => (
              <li key={e.id} className="py-2.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{e.rezeptName}</div>
                  {e.notiz && <div className="text-xs text-text-secondary italic">„{e.notiz}“</div>}
                  <div className={`text-xs mt-0.5 ${e.gesehenAm ? 'text-success' : 'text-text-muted'}`}>
                    Gesendet am {datumKurz(e.erstelltAm)} · {e.gesehenAm ? `gesehen am ${datumKurz(e.gesehenAm)}` : 'noch nicht gesehen'}
                  </div>
                </div>
                <button onClick={() => void loeschen(e.id)} aria-label={`Empfehlung ${e.rezeptName} zurücknehmen`} className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Auswahl */}
      <section aria-label="Rezept auswählen" className="card space-y-3">
        <h3 className="font-semibold text-text-primary">Rezept empfehlen</h3>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
          <input className="input pl-10" placeholder="Rezept oder Zutat suchen" aria-label="Rezept suchen" value={suche} onChange={e => { setSuche(e.target.value); setAnzahl(SEITE) }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {MAHLZEITEN.map(m => (
            <button key={m} aria-pressed={mahlzeit === m} onClick={() => { setMahlzeit(mahlzeit === m ? null : m); setAnzahl(SEITE) }}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium ${mahlzeit === m ? 'bg-primary text-white border-brand' : 'border-border text-text-secondary'}`}>{m}</button>
          ))}
        </div>
        {!profil.leer && (
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
            <input type="checkbox" checked={nurPassend} onChange={e => setNurPassend(e.target.checked)} className="w-4 h-4 accent-[rgb(var(--c-brand))]" />
            Nur Rezepte zeigen, die zur Anamnese passen {verborgen > 0 && <span className="text-text-muted">({verborgen} ausgeblendet)</span>}
          </label>
        )}
        <div className="text-xs text-text-muted" aria-live="polite">{gefiltert.length} Rezepte</div>

        <ul className="divide-y divide-border" data-testid="coach-rezepte">
          {gefiltert.slice(0, anzahl).map(t => {
            const r = t.r
            const istOffen = offen === r.id
            const schonDa = bereitsEmpfohlen.get(r.id)
            return (
              <li key={r.id} className="py-2">
                <button onClick={() => { setOffen(istOffen ? null : r.id); setNotiz(schonDa?.notiz ?? ''); setMeldung(null) }} aria-expanded={istOffen}
                  className="w-full flex items-center gap-3 text-left">
                  <RezeptBild r={r} className="w-14 h-14 rounded-xl shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-text-primary truncate">{r.name}</span>
                    <span className="block text-xs text-text-muted">{Math.round(r.pro.kcal)} kcal · {r.zeitMin} Min. · {r.mahlzeiten.join(', ')}</span>
                    {(t.konflikte?.length ?? 0) > 0 && <span className="inline-flex items-center gap-1 text-[11px] text-danger"><AlertTriangle size={11} aria-hidden="true" />Enthält: {t.konflikte!.join(', ')}</span>}
                    {schonDa && <span className="block text-[11px] text-success">Bereits empfohlen am {datumKurz(schonDa.erstelltAm)}</span>}
                  </span>
                  {istOffen ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                </button>
                {istOffen && (
                  <div className="mt-3 space-y-3 rounded-2xl bg-bg-elevated border border-border p-3" data-testid="coach-detail">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      {([['kcal', Math.round(r.pro.kcal), ''], ['Eiweiß', r.pro.protein, ' g'], ['Karbs', r.pro.kh, ' g'], ['Fett', r.pro.fett, ' g']] as const).map(([l, v, u]) => (
                        <div key={l}><div className="font-bold text-text-primary">{zahl(v, l === 'kcal' ? 0 : 1)}{u}</div><div className="text-text-muted">{l}</div></div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">{ARTEN.filter(a => r.arten.includes(a.id)).map(a => <span key={a.id} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary">{a.label}</span>)}</div>
                    <div className="text-xs text-text-secondary"><strong>Zutaten (pro {r.portionen} {r.portionen === 1 ? 'Portion' : 'Portionen'}):</strong> {r.zutaten.map(z => ZUTATEN[z.id] ? zutatZeile(ZUTATEN[z.id], z.g) : '').filter(Boolean).join(' · ')}</div>
                    {t.warnungen.length > 0 && <div className="text-xs text-warning">Laut Anamnese beachten: {t.warnungen.map(w => w.text).join('; ')}. Keine ärztliche Empfehlung.</div>}
                    <div>
                      <label className="label" htmlFor={`notiz-${r.id}`}>Notiz an {clientName} (optional)</label>
                      <textarea id={`notiz-${r.id}`} className="input resize-none text-sm" rows={2} maxLength={300} placeholder="z. B. Gut als Mittagessen nach dem Training"
                        value={notiz} onChange={e => setNotiz(e.target.value)} />
                    </div>
                    <button onClick={() => void senden(r.id, r.name)} disabled={sendet} className="btn-primary w-full flex items-center justify-center gap-2">
                      {sendet ? <Spinner size={14} /> : <Send size={14} />} {schonDa ? 'Erneut empfehlen' : 'Empfehlen'}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {gefiltert.length > anzahl && <button onClick={() => setAnzahl(a => a + SEITE)} className="btn-secondary w-full">Mehr anzeigen</button>}
        {gefiltert.length === 0 && <p className="text-sm text-text-muted text-center py-4">Keine Rezepte gefunden.</p>}
      </section>
    </div>
  )
}
