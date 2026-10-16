import { useState } from 'react'
import { Ban, ThumbsDown, Trash2, Plus } from 'lucide-react'
import { Sheet, Hinweis } from './gemeinsam'
import { AUSSCHLUSS_VORSCHLAEGE } from '../../../lib/entdecken/katalog'
import type { AnamneseProfil } from '../../../lib/entdecken/filter'
import type { AnamneseTexte } from '../../../lib/entdecken/daten'
import type { AusschlussArt } from '../../../lib/entdecken/types'
import type { usePersoenlich } from '../../../lib/entdecken/daten'

type Einstellungen = ReturnType<typeof usePersoenlich>

const ART_TEXT: Record<AusschlussArt, { label: string; hilfe: string }> = {
  hart: { label: 'Allergie / Unverträglichkeit', hilfe: 'Rezept wird ausgeblendet' },
  weich: { label: 'Schmeckt mir nicht', hilfe: 'Rezept rutscht nach hinten und wird markiert' },
}

export function PersoenlichSheet({ einstellungen, anamnese, profil, onClose }: {
  einstellungen: Einstellungen; anamnese: AnamneseTexte | null; profil: AnamneseProfil | null; onClose: () => void
}) {
  const { ausschluesse, anamneseFilter, setAnamneseFilter, hinzufuegen, entfernen, artAendern, nurLokal, fehler, setFehler } = einstellungen
  const [begriff, setBegriff] = useState('')
  const [art, setArt] = useState<AusschlussArt>('hart')

  async function neu(b: string) {
    if (await hinzufuegen(b, art)) setBegriff('')
  }

  return (
    <Sheet titel="Meine Einschränkungen" untertitel="Gilt für alle Rezepte in Entdecken" onClose={onClose}>
      <div className="space-y-6">
        {/* Anamnese */}
        <section className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" role="switch" checked={anamneseFilter} onChange={e => setAnamneseFilter(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[rgb(var(--c-brand))] shrink-0" />
            <span>
              <span className="block text-sm font-semibold text-text-primary">Anamnese zum Filtern nutzen</span>
              <span className="block text-xs text-text-secondary">Allergien und Unverträglichkeiten aus deiner Anamnese blenden Rezepte aus. Diagnosen führen zu Hinweisen und sortieren betroffene Rezepte nach hinten.</span>
            </span>
          </label>

          {anamneseFilter && (
            <div className="rounded-2xl bg-bg-elevated border border-border p-3 space-y-2 text-sm" data-testid="anamnese-erkannt">
              {anamnese === null ? <div className="text-text-muted">Anamnese wird geladen…</div>
                : !anamnese.ausgefuellt && (anamnese.allergien + anamnese.erkrankungen).trim() === '' ? (
                  <div className="text-text-secondary">Deine Anamnese enthält noch keine Angaben zu Allergien oder Diagnosen. Trage unten einfach eigene Begriffe ein.</div>
                ) : profil && (
                  <>
                    <div><span className="text-text-muted">Ausgeblendet (Allergie/Unverträglichkeit): </span>
                      {profil.harte.length ? profil.harte.map(h => h.label).join(', ') : <span className="text-text-muted">nichts erkannt</span>}</div>
                    <div><span className="text-text-muted">Hinweise (Diagnosen): </span>
                      {profil.diagnosen.length ? profil.diagnosen.map(d => d.label).join(', ') : <span className="text-text-muted">nichts erkannt</span>}</div>
                    {profil.unbekannt.length > 0 && (
                      <div className="text-xs text-text-muted">Nicht zugeordnet, bitte bei Bedarf unten selbst eintragen: {profil.unbekannt.join(', ')}</div>
                    )}
                    <Hinweis />
                  </>
                )}
            </div>
          )}
        </section>

        {/* Ausschlussliste */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Meine Ausschlussliste</h3>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Art des Ausschlusses">
            {(['hart', 'weich'] as const).map(a => (
              <button key={a} role="radio" aria-checked={art === a} onClick={() => setArt(a)}
                className={`text-left rounded-2xl border p-3 transition-colors ${art === a ? 'border-brand bg-brand/10' : 'border-border'}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                  {a === 'hart' ? <Ban size={14} className="text-danger" /> : <ThumbsDown size={14} className="text-warning" />} {ART_TEXT[a].label}
                </span>
                <span className="block text-[11px] text-text-muted mt-0.5">{ART_TEXT[a].hilfe}</span>
              </button>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void neu(begriff) }}>
            <input className="input" placeholder="z. B. Pilze" value={begriff} maxLength={60}
              onChange={e => { setBegriff(e.target.value); setFehler('') }} aria-label="Begriff für die Ausschlussliste" />
            <button type="submit" className="btn-primary px-4 flex items-center gap-1" disabled={begriff.trim().length < 2}><Plus size={16} />Hinzufügen</button>
          </form>
          {fehler && <div className="text-xs text-danger" role="alert">{fehler}</div>}
          <div className="flex flex-wrap gap-1.5">
            {AUSSCHLUSS_VORSCHLAEGE.filter(v => !ausschluesse.some(a => a.begriff.toLowerCase() === v.toLowerCase())).map(v => (
              <button key={v} onClick={() => void neu(v)} className="text-xs rounded-full border border-dashed border-border px-2.5 py-1 text-text-secondary hover:border-brand/60 hover:text-text-primary">+ {v}</button>
            ))}
          </div>
          {ausschluesse.length === 0 ? (
            <div className="text-sm text-text-muted">Noch nichts eingetragen.</div>
          ) : (
            <ul className="rounded-2xl border border-border divide-y divide-border" data-testid="ausschlussliste">
              {ausschluesse.map(a => (
                <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 text-sm text-text-primary truncate">{a.begriff}</span>
                  <button onClick={() => artAendern(a.id, a.art === 'hart' ? 'weich' : 'hart')}
                    className={`text-[11px] font-medium rounded-full border px-2 py-0.5 ${a.art === 'hart' ? 'border-danger/40 text-danger bg-danger/10' : 'border-warning/40 text-warning bg-warning/10'}`}
                    title="Art ändern">{a.art === 'hart' ? 'Ausblenden' : 'Nach hinten'}</button>
                  <button onClick={() => entfernen(a.id)} aria-label={`${a.begriff} entfernen`} className="p-1.5 rounded-lg text-text-muted hover:text-danger"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          {nurLokal && <div className="text-xs text-warning">Die Liste wird gerade nur auf diesem Gerät gespeichert, bis die Datenbank aktualisiert ist.</div>}
          <p className="text-[11px] text-text-muted">Die Suche nach Begriffen ist eine Hilfe und prüft Zutatenlisten, nicht Spuren oder Zubereitung. Bei schweren Allergien bitte immer selbst die Zutaten kontrollieren.</p>
        </section>
      </div>
    </Sheet>
  )
}
