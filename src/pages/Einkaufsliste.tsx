import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChefHat, Info, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { STARTBIBLIOTHEK, useEinkauf, useKiRezepte } from '../lib/entdecken/daten'
import { listeText, portionenTextKurz, teile } from '../lib/entdecken/teilen'
import { baueGemeinsameListe, EIGEN_PRAEFIX } from '../lib/einkauf/liste'
import { useEigeneArtikel } from '../lib/einkauf/daten'
import { euroSpanne } from '../lib/einkauf/preise'
import type { Rezept } from '../types/database'
import { DruckAnsicht, ListeDruck } from './rezepte/entdecken/Druck'
import { TeilenDruckenLeiste, teilenMeldung } from './rezepte/entdecken/gemeinsam'

export function Einkaufsliste() {
  const { user } = useAuth()
  const userId = user!.id
  const einkauf = useEinkauf(userId)
  const ki = useKiRezepte(userId)
  const artikel = useEigeneArtikel(userId)
  const [eigene, setEigene] = useState<Map<string, Rezept>>(new Map())
  const [eigeneGeladen, setEigeneGeladen] = useState(false)
  const [neuerArtikel, setNeuerArtikel] = useState('')
  const [leerenFrage, setLeerenFrage] = useState(false)
  const [drucken, setDrucken] = useState(false)
  const [status, setStatus] = useState('')
  const druckFertig = useCallback(() => setDrucken(false), [])

  // Eigene Rezepte, die auf der Liste stehen, nachladen
  const eigeneIds = useMemo(
    () => einkauf.eintraege.filter(e => e.rezeptId.startsWith(EIGEN_PRAEFIX)).map(e => e.rezeptId.slice(EIGEN_PRAEFIX.length)),
    [einkauf.eintraege],
  )
  const eigeneSchluessel = eigeneIds.join(',')
  useEffect(() => {
    if (!eigeneSchluessel) { setEigene(new Map()); setEigeneGeladen(true); return }
    let aktiv = true
    supabase.from('rezepte').select('*').in('id', eigeneSchluessel.split(',')).then(({ data }) => {
      if (!aktiv) return
      if (data) setEigene(new Map((data as Rezept[]).map(r => [r.id, r])))
      setEigeneGeladen(true)
    })
    return () => { aktiv = false }
  }, [eigeneSchluessel])

  const entdecken = useMemo(() => new Map([...ki.rezepte, ...STARTBIBLIOTHEK].map(r => [r.id, r])), [ki.rezepte])
  const liste = useMemo(
    () => baueGemeinsameListe(einkauf.eintraege, entdecken, eigene, artikel.artikel),
    [einkauf.eintraege, entdecken, eigene, artikel.artikel],
  )
  const { haken } = einkauf
  const erledigt = liste.bereiche.reduce((s, b) => s + b.zeilen.filter(z => haken.has(z.id)).length, 0)
  const leer = einkauf.eintraege.length === 0 && artikel.artikel.length === 0
  const k = liste.kosten

  async function artikelHinzufuegen(e: React.FormEvent) {
    e.preventDefault()
    if (await artikel.hinzufuegen(neuerArtikel)) setNeuerArtikel('')
  }

  async function portionen(eintragId: string, delta: number) {
    const e = einkauf.eintraege.find(x => x.id === eintragId)
    if (!e) return
    const neu = Math.min(24, Math.max(1, e.portionen + delta))
    if (neu !== e.portionen) await einkauf.hinzufuegen({ id: e.rezeptId, name: e.rezeptName }, neu)
  }

  async function abgehakteEntfernen() {
    const ids = [...haken].filter(id => id.startsWith('a:')).map(id => id.slice(2))
    await artikel.entfernen(ids)
    einkauf.hakenLoeschen()
  }

  async function allesLeeren() {
    await Promise.all([einkauf.leeren(), artikel.leeren()])
    setLeerenFrage(false)
  }

  async function teilen() {
    setStatus(teilenMeldung(await teile('Einkaufsliste', listeText(liste, haken))))
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title text-2xl flex items-center gap-2"><ShoppingCart size={24} className="text-brand" /> Einkaufsliste</h1>
        <p className="text-text-secondary text-sm mt-0.5">Alles, was du für deine Rezepte brauchst, nach Supermarkt-Bereichen sortiert, mit Kostenschätzung.</p>
      </div>

      {/* Kostenprognose */}
      {!leer && (
        <div className="card">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Geschätzte Kosten</div>
          {k.bepreist > 0 ? (
            <div className="text-3xl font-bold text-text-primary mt-1" data-testid="einkauf-kosten">≈ {euroSpanne(k.min, k.max)}</div>
          ) : (
            <div className="text-sm text-text-secondary mt-1">Für diese Artikel gibt es noch keine Preisschätzung.</div>
          )}
          <p className="text-[11px] text-text-muted mt-1.5 flex gap-1.5">
            <Info size={12} className="shrink-0 mt-0.5" />
            <span>
              Discounter bis Supermarkt, anteilig für die Mengen in den Rezepten. Ganze Packungen kosten oft mehr, Vorräte wie Öl und Gewürze hast du meist schon.
              {k.ohnePreis.length > 0 && ` Ohne Preis: ${k.ohnePreis.length === 1 ? '1 Artikel' : `${k.ohnePreis.length} Artikel`}.`}
            </span>
          </p>
        </div>
      )}

      {/* Rezepte auf der Liste */}
      {einkauf.eintraege.length > 0 && (
        <section aria-label="Rezepte auf der Liste" className="space-y-2">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Rezepte auf der Liste</h2>
          <ul className="space-y-2" data-testid="einkauf-rezepte">
            {einkauf.eintraege.map(e => {
              const ke = liste.kostenJeEintrag.get(e.id)
              const fehlt = liste.verwaist.some(v => v.id === e.id)
              const laedt = fehlt && !(e.rezeptId.startsWith(EIGEN_PRAEFIX) ? eigeneGeladen : ki.geladen)
              return (
                <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-bg-elevated border border-border px-3 py-2.5">
                  <ChefHat size={16} className="text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{e.rezeptName}</div>
                    <div className="text-[11px] text-text-muted">
                      {laedt ? 'wird geladen …' : fehlt ? 'Rezept nicht mehr vorhanden' : ke && ke.bepreist > 0 ? `≈ ${euroSpanne(ke.min, ke.max)}` : 'ohne Preisschätzung'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" role="group" aria-label={`Portionen ${e.rezeptName}`}>
                    <button onClick={() => portionen(e.id, -1)} disabled={e.portionen <= 1} aria-label="Eine Portion weniger" className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-text-secondary disabled:opacity-40"><Minus size={14} /></button>
                    <span className="text-xs font-semibold text-text-primary w-12 text-center">{portionenTextKurz(e.portionen)} Port.</span>
                    <button onClick={() => portionen(e.id, 1)} disabled={e.portionen >= 24} aria-label="Eine Portion mehr" className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-text-secondary disabled:opacity-40"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => void einkauf.entfernen(e.id)} aria-label={`${e.rezeptName} von der Liste entfernen`} className="p-1.5 rounded-full text-text-muted hover:text-danger shrink-0"><X size={16} /></button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Eigener Artikel */}
      <form onSubmit={artikelHinzufuegen} className="flex gap-2">
        <input className="input flex-1" value={neuerArtikel} onChange={e => setNeuerArtikel(e.target.value)} maxLength={120}
          placeholder="Eigener Artikel, z. B. 2 l Milch" aria-label="Eigenen Artikel hinzufügen" />
        <button type="submit" disabled={!neuerArtikel.trim()} className="btn-primary px-4 flex items-center gap-1.5 disabled:opacity-50"><Plus size={16} /> Dazu</button>
      </form>
      {artikel.fehler && <p className="text-xs text-danger">{artikel.fehler}</p>}

      {leer ? (
        <div className="text-center py-10 space-y-2 text-sm text-text-muted">
          <ShoppingCart size={28} className="mx-auto" aria-hidden="true" />
          <div>Deine Einkaufsliste ist leer.</div>
          <div>Öffne ein Rezept unter <Link to="/rezepte" className="text-brand hover:underline">Rezepte</Link> und tippe auf „Auf die Einkaufsliste“.</div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>{erledigt} von {liste.anzahl} erledigt</span>
            {erledigt > 0 && <button onClick={abgehakteEntfernen} className="text-text-muted hover:text-text-primary">Abgehakte entfernen</button>}
          </div>

          {liste.bereiche.map(b => (
            <section key={b.name} aria-label={b.name} className="space-y-1.5">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">{b.name}</h3>
              <ul className="rounded-2xl bg-bg-elevated border border-border divide-y divide-border">
                {b.zeilen.map(z => {
                  const fertig = haken.has(z.id)
                  return (
                    <li key={z.id} className="flex items-center">
                      <label className="flex-1 flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none min-w-0">
                        <input type="checkbox" checked={fertig} onChange={() => einkauf.hakenUmschalten(z.id)} className="w-5 h-5 accent-[rgb(var(--c-brand))] shrink-0" />
                        <span className={`flex-1 text-sm ${fertig ? 'line-through text-text-muted' : 'text-text-primary'}`}>{z.text}</span>
                        {z.aus.length > 1 && <span className="text-[10px] text-text-muted shrink-0">{z.aus.length} Rezepte</span>}
                      </label>
                      {z.id.startsWith('a:') && (
                        <button onClick={() => void artikel.entfernen([z.id.slice(2)])} aria-label={`${z.text} entfernen`} className="p-2 mr-1 text-text-muted hover:text-danger"><X size={14} /></button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          <TeilenDruckenLeiste onTeilen={teilen} onDrucken={() => setDrucken(true)} status={status} />

          <div className="flex items-center justify-end text-xs">
            {leerenFrage ? (
              <span className="flex items-center gap-2">
                <span className="text-text-secondary">Liste wirklich leeren?</span>
                <button onClick={allesLeeren} className="text-danger font-semibold">Ja, leeren</button>
                <button onClick={() => setLeerenFrage(false)} className="text-text-muted">Abbrechen</button>
              </span>
            ) : (
              <button onClick={() => setLeerenFrage(true)} className="inline-flex items-center gap-1 text-text-muted hover:text-danger"><Trash2 size={12} /> Liste leeren</button>
            )}
          </div>
          <p className="text-[11px] text-text-muted">
            Mengen sind aus den Rezepten zusammengerechnet. Haken werden auf diesem Gerät gemerkt.
            Preise sind Richtwerte aus einer festen Preistabelle (keine Live-Preise).
            {einkauf.nurLokal && ' Die Rezeptliste wird gerade nur auf diesem Gerät gespeichert.'}
          </p>
        </>
      )}
      {drucken && <DruckAnsicht onFertig={druckFertig}><ListeDruck liste={liste} haken={haken} /></DruckAnsicht>}
    </div>
  )
}
