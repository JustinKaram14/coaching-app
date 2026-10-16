import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, Clock, Flame, Search, ShieldCheck, ShoppingCart, SlidersHorizontal, Sparkles, X, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { DATA_CHANGED_EVENT } from '../../../lib/supabase'
import {
  STARTBIBLIOTHEK, ladeHeute, useAnamneseTexte, useEinkauf, useFavoriten, useKiRezepte, usePersoenlich,
} from '../../../lib/entdecken/daten'
import {
  LEERER_FILTER, bewerte, filterAktiv, filterAnzahl, leseAnamnese, naechsteMahlzeit, rezeptDesTages, tagesVorschlaege, wendeAn,
  type FilterZustand, type Treffer, type TagesStand,
} from '../../../lib/entdecken/filter'
import {
  ARTEN, DARM_ARTEN, GESUNDHEIT_REIHEN, KATEGORIEN, KCAL_SPANNEN, REIHEN, type DarmArt,
} from '../../../lib/entdecken/katalog'
import { SCHWELLEN } from '../../../lib/entdecken/engine'
import type { Mahlzeit } from '../../../lib/entdecken/types'
import { EinkaufKontext, FavoritHerz, FavoritenKontext, Hinweis, RezeptBild, zahl } from './gemeinsam'
import { toLocalISO } from '../../../lib/utils'
import { RezeptKarte } from './RezeptKarte'
import { RezeptDetail } from './RezeptDetail'
import { FilterSheet, Chip } from './FilterSheet'
import { PersoenlichSheet } from './PersoenlichSheet'
import { KiDialog } from './KiDialog'
import { BilderAdmin } from './BilderAdmin'
import { EinkaufslisteSheet } from './EinkaufslisteSheet'
import { CoachEmpfehlungen } from './CoachEmpfehlungen'
import { istAktuell, useEmpfehlungen, type Empfehlung } from '../../../lib/entdecken/empfehlungen'
import { FortschrittsBalken, PflanzenSheet } from './PflanzenSheet'
import { PFLANZEN_ZIEL, wochenStart } from '../../../lib/entdecken/pflanzen'
import { usePflanzen } from '../../../lib/entdecken/pflanzenDaten'
import { baueEinkaufsListe } from '../../../lib/entdecken/einkauf'

function Reihe({ titel, emoji, items, onAlle, onOeffnen, gesundheit = false, leer, extra }: {
  titel: string; emoji: string; items: Treffer[]; onAlle?: () => void; onOeffnen: (t: Treffer) => void
  gesundheit?: boolean; leer?: string; extra?: ReactNode
}) {
  if (items.length === 0 && !leer) return null
  return (
    <section aria-label={titel} className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-text-primary flex-1"><span aria-hidden="true">{emoji} </span>{titel}</h3>
        {onAlle && items.length > 0 && (
          <button onClick={onAlle} className="text-sm text-brand font-medium flex items-center gap-0.5 hover:underline">Alle <ChevronRight size={14} /></button>
        )}
      </div>
      {extra}
      {items.length === 0 ? <div className="text-sm text-text-muted">{leer}</div> : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x scrollbar-none">
          {items.slice(0, 12).map(t => (
            <div key={t.r.id} className="snap-start"><RezeptKarte t={t} onOpen={() => onOeffnen(t)} gesundheit={gesundheit} /></div>
          ))}
        </div>
      )}
    </section>
  )
}

function BallaststoffKarte({ stand, ohneAngabe, vorschlaege, mahlzeit, onOeffnen }: {
  stand: TagesStand; ohneAngabe: number; vorschlaege: ReturnType<typeof tagesVorschlaege>; mahlzeit: Mahlzeit; onOeffnen: (t: Treffer) => void
}) {
  const ziel = SCHWELLEN.ballaststoffTagesziel
  const rest = Math.max(0, ziel - stand.ballast)
  const anteil = Math.min(1, stand.ballast / ziel)
  return (
    <section aria-label="Ballaststoffe heute" className="card space-y-3" data-testid="ballaststoff-karte">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-text-primary">🌾 Ballaststoffe heute</h3>
        <span className="text-sm text-text-secondary tabular-nums"><strong className="text-text-primary">{zahl(stand.ballast, 1)}</strong> / {ziel} g</span>
      </div>
      <div className="h-2.5 rounded-full bg-bg-elevated overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={ziel} aria-valuenow={Math.min(ziel, stand.ballast)} aria-label="Ballaststoffe heute">
        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${anteil * 100}%` }} />
      </div>
      {ohneAngabe > 0 && (
        <p className="text-xs text-text-muted">{ohneAngabe} {ohneAngabe === 1 ? 'Eintrag' : 'Einträge'} im Tagebuch {ohneAngabe === 1 ? 'hat' : 'haben'} keine Ballaststoff-Angabe und {ohneAngabe === 1 ? 'zählt' : 'zählen'} nicht mit.</p>
      )}
      {rest === 0 ? (
        <p className="text-sm text-success font-medium">Tagesziel erreicht.</p>
      ) : vorschlaege.length > 0 ? (
        <>
          <p className="text-sm text-text-secondary">Noch <strong>{zahl(rest, 0)} g</strong> offen. Das passt zum Rest deines Tages ({mahlzeit}, noch {Math.max(0, stand.kcalZiel - stand.kcal)} kcal):</p>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 snap-x scrollbar-none">
            {vorschlaege.map(v => (
              <div key={v.t.r.id} className="snap-start shrink-0 w-44">
                <RezeptKarte t={v.t} onOpen={() => onOeffnen(v.t)} breit gesundheit />
                <div className="text-[11px] text-success font-medium mt-1 px-1">+{zahl(v.ballast, 1)} g Ballaststoffe</div>
              </div>
            ))}
          </div>
          <Hinweis />
        </>
      ) : (
        <p className="text-sm text-text-secondary">{stand.kcalZiel - stand.kcal < 60 ? 'Dein Kalorienziel für heute ist fast erreicht, dafür passt kein weiteres Rezept mehr.' : 'Für den Rest deines Tages gibt es gerade keinen passenden Vorschlag.'}</p>
      )}
    </section>
  )
}

export function EntdeckenTab() {
  const { user, profile } = useAuth()
  const userId = user!.id
  const einstellungen = usePersoenlich(userId)
  const anamneseTexte = useAnamneseTexte(userId)
  const ki = useKiRezepte(userId)
  const fav = useFavoriten(userId)
  const einkauf = useEinkauf(userId)
  const empfehlungen = useEmpfehlungen(userId)
  const [einkaufOffen, setEinkaufOffen] = useState(false)
  const [pflanzenOffen, setPflanzenOffen] = useState(false)
  const diesewoche = wochenStart(toLocalISO(new Date()))
  const pflanzenWoche = usePflanzen(userId, diesewoche)

  const [filter, setFilter] = useState<FilterZustand>(LEERER_FILTER)
  const [filterOffen, setFilterOffen] = useState(false)
  const [persoenlichOffen, setPersoenlichOffen] = useState(false)
  const [kiOffen, setKiOffen] = useState(false)
  const [offen, setOffen] = useState<{ id: string } | null>(null)
  const [darmTab, setDarmTab] = useState<DarmArt | 'alle'>('alle')
  const [heute, setHeute] = useState<Awaited<ReturnType<typeof ladeHeute>> | null>(null)

  const neuLaden = useCallback(() => { ladeHeute(userId).then(setHeute).catch(() => {}) }, [userId])
  useEffect(() => {
    neuLaden()
    window.addEventListener(DATA_CHANGED_EVENT, neuLaden)
    return () => window.removeEventListener(DATA_CHANGED_EVENT, neuLaden)
  }, [neuLaden])

  const profil = useMemo(
    () => (einstellungen.anamneseFilter && anamneseTexte ? leseAnamnese(anamneseTexte.allergien, anamneseTexte.erkrankungen) : null),
    [einstellungen.anamneseFilter, anamneseTexte],
  )
  const persoenlich = useMemo(() => ({ ausschluesse: einstellungen.ausschluesse, anamnese: profil, favoriten: fav.favoriten }), [einstellungen.ausschluesse, profil, fav.favoriten])
  const alle = useMemo(() => [...ki.rezepte, ...STARTBIBLIOTHEK], [ki.rezepte])

  const basis = useMemo(() => wendeAn(alle, LEERER_FILTER, persoenlich), [alle, persoenlich])
  const ergebnis = useMemo(() => wendeAn(alle, filter, persoenlich), [alle, filter, persoenlich])
  const liste = filterAktiv(filter)

  const offenesRezept = offen ? alle.find(r => r.id === offen.id) : undefined
  const offenerTreffer: Treffer | undefined = offenesRezept
    ? (basis.treffer.find(t => t.r.id === offen!.id) ?? bewerte(offenesRezept, persoenlich))
    : undefined
  const oeffnen = (t: Treffer) => setOffen({ id: t.r.id })
  const empfehlungsKarten = useMemo(() => {
    const byId = new Map(alle.map(r => [r.id, r]))
    return empfehlungen.liste.filter(e => istAktuell(e)).slice(0, 10).flatMap(e => {
      const r = byId.get(e.rezeptId)
      return r ? [{ e, t: bewerte(r, persoenlich) }] : []
    })
  }, [empfehlungen.liste, alle, persoenlich])
  const empfehlungOeffnen = (e: Empfehlung, t: Treffer) => { void empfehlungen.alsGesehenMarkieren(e.id); oeffnen(t) }
  const einkaufsListe = useMemo(
    () => baueEinkaufsListe(einkauf.eintraege, new Map(alle.map(r => [r.id, r]))),
    [einkauf.eintraege, alle],
  )
  const einkaufKontext = useMemo(() => ({
    hinzufuegen: einkauf.hinzufuegen,
    portionenAufListe: (id: string) => einkauf.eintraege.find(e => e.rezeptId === id)?.portionen ?? null,
    oeffneListe: () => setEinkaufOffen(true),
  }), [einkauf.hinzufuegen, einkauf.eintraege])
  const tagesRezept = useMemo(() => rezeptDesTages(basis.treffer, userId, toLocalISO(new Date())), [basis, userId])
  const favoritenTreffer = useMemo(() => basis.treffer.filter(t => fav.favoriten.has(t.r.id)), [basis, fav.favoriten])

  const stand: TagesStand | null = heute && { ballast: heute.ballast, kcal: heute.kcal, kcalZiel: heute.kcalZiel, belegt: heute.belegt }
  const vorschlagMahlzeit = stand ? naechsteMahlzeit(stand.belegt, new Date().getHours()) : 'Mittagessen'
  const vorschlaege = useMemo(
    () => (stand ? tagesVorschlaege(basis.treffer, stand, vorschlagMahlzeit) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basis, heute, vorschlagMahlzeit],
  )

  const gesundheitReihen = {
    ballast: basis.treffer.filter(t => t.r.gesundheit.ballaststoffreich).sort((a, b) => b.r.pro.ballast - a.r.pro.ballast),
    aox: basis.treffer.filter(t => t.r.gesundheit.antioxidantien >= 2).sort((a, b) => b.r.gesundheit.antioxidantien - a.r.gesundheit.antioxidantien),
    darm: basis.treffer.filter(t => {
      const g = t.r.gesundheit
      return darmTab === 'alle' ? g.darmfreundlich || g.leichtVerdaulich
        : darmTab === 'praebiotisch' ? g.praebiotisch : darmTab === 'probiotisch' ? g.probiotisch
          : darmTab === 'fermentiert' ? g.fermentiert : g.leichtVerdaulich
    }),
    pflanzen: basis.treffer.filter(t => t.r.pflanzen.length >= SCHWELLEN.pflanzenReich).sort((a, b) => b.r.pflanzen.length - a.r.pflanzen.length),
    omega3: basis.treffer.filter(t => t.r.gesundheit.entzuendungshemmend).sort((a, b) => b.r.pro.omega3 - a.r.pro.omega3),
  }

  const persoenlichAktiv = einstellungen.anamneseFilter || einstellungen.ausschluesse.length > 0
  const anzahlFilter = filterAnzahl(filter)

  return (
    <FavoritenKontext.Provider value={{ favoriten: fav.favoriten, umschalten: id => void fav.umschalten(id) }}>
    <EinkaufKontext.Provider value={einkaufKontext}>
    <div className="space-y-6">
      {/* Suche und Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
          <input type="search" className="input pl-10" placeholder="Rezept suchen" aria-label="Entdecken durchsuchen"
            value={filter.suche} onChange={e => setFilter(f => ({ ...f, suche: e.target.value }))} />
        </div>
        <button onClick={() => setFilterOffen(true)} aria-label="Filter" className="relative btn-secondary px-3.5 flex items-center">
          <SlidersHorizontal size={18} />
          {anzahlFilter > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">{anzahlFilter}</span>}
        </button>
        <button onClick={() => setEinkaufOffen(true)} aria-label={`Einkaufsliste${einkauf.eintraege.length ? `, ${einkauf.eintraege.length} Rezepte` : ''}`} className="relative btn-secondary px-3.5 flex items-center">
          <ShoppingCart size={18} className={einkauf.eintraege.length ? 'text-brand' : ''} />
          {einkauf.eintraege.length > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">{einkauf.eintraege.length}</span>}
        </button>
        <button onClick={() => setPersoenlichOffen(true)} aria-label="Meine Einschränkungen" className="relative btn-secondary px-3.5 flex items-center">
          <ShieldCheck size={18} className={persoenlichAktiv ? 'text-brand' : ''} />
          {persoenlichAktiv && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand" />}
        </button>
      </div>

      {persoenlichAktiv && (
        <div className="flex items-center gap-2 text-xs text-text-secondary" data-testid="persoenlich-info">
          <ShieldCheck size={13} className="text-brand shrink-0" aria-hidden="true" />
          <span>
            Deine Einschränkungen sind aktiv
            {basis.ausgeblendet > 0 && <> · <strong>{basis.ausgeblendet}</strong> {basis.ausgeblendet === 1 ? 'Rezept' : 'Rezepte'} ausgeblendet</>}
          </span>
          <button onClick={() => setPersoenlichOffen(true)} className="text-brand hover:underline ml-auto shrink-0">Ändern</button>
        </div>
      )}

      {liste ? (
        /* ── Trefferliste ── */
        <section aria-label="Ergebnisse" className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setFilter(LEERER_FILTER)} className="p-2 rounded-xl hover:bg-bg-elevated text-text-secondary" aria-label="Zurück zur Übersicht"><ArrowLeft size={18} /></button>
            <div className="flex-1 text-sm text-text-secondary" aria-live="polite">
              <strong className="text-text-primary">{ergebnis.treffer.length}</strong> {ergebnis.treffer.length === 1 ? 'Rezept' : 'Rezepte'}
              {ergebnis.ausgeblendet > 0 && <span className="text-text-muted"> · {ergebnis.ausgeblendet} wegen deiner Einschränkungen ausgeblendet</span>}
            </div>
            <button onClick={() => setFilter(LEERER_FILTER)} className="text-sm text-brand flex items-center gap-1 hover:underline"><X size={14} />Zurücksetzen</button>
          </div>
          <FilterChipsZeile filter={filter} onChange={setFilter} />
          {(filter.gesundheit.length > 0 || filter.darmArt) && <Hinweis lang />}
          {ergebnis.treffer.length === 0 ? (
            <div className="text-center py-14 text-sm text-text-muted space-y-3">
              <div>Keine Rezepte gefunden.</div>
              <button onClick={() => setFilter(LEERER_FILTER)} className="btn-secondary">Filter zurücksetzen</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ergebnis.treffer.map(t => <RezeptKarte key={t.r.id} t={t} onOpen={() => oeffnen(t)} breit gesundheit={filter.gesundheit.length > 0 || !!filter.darmArt} />)}
            </div>
          )}
        </section>
      ) : (
        /* ── Übersicht ── */
        <>
          <CoachEmpfehlungen eintraege={empfehlungsKarten} onOeffnen={empfehlungOeffnen} />

          {tagesRezept && (
            <section aria-label="Rezept des Tages" className="relative rounded-3xl overflow-hidden border border-border bg-bg-card" data-testid="rezept-des-tages">
              <button onClick={() => oeffnen(tagesRezept)} className="block w-full text-left">
                <RezeptBild r={tagesRezept.r} className="w-full aspect-[16/9]" />
                <div className="p-4 space-y-1">
                  <div className="text-xs font-semibold text-brand uppercase tracking-wide">Rezept des Tages</div>
                  <div className="text-lg font-bold text-text-primary leading-snug">{tagesRezept.r.name}</div>
                  <div className="flex items-center gap-3 text-sm text-text-muted">
                    <span className="inline-flex items-center gap-1"><Flame size={14} aria-hidden="true" />{Math.round(tagesRezept.r.pro.kcal)} kcal</span>
                    <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden="true" />{tagesRezept.r.zeitMin} Min.</span>
                    <span>{tagesRezept.r.mahlzeiten[0]}</span>
                  </div>
                </div>
              </button>
              <FavoritHerz r={tagesRezept.r} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/55 text-white hover:bg-black/75" />
            </section>
          )}

          {favoritenTreffer.length > 0 && (
            <Reihe titel="Meine Favoriten" emoji="♥" items={favoritenTreffer} onOeffnen={oeffnen}
              onAlle={() => setFilter(f => ({ ...f, nurFavoriten: true }))} />
          )}
          {fav.nurLokal && favoritenTreffer.length > 0 && <p className="text-xs text-warning -mt-4">Favoriten werden gerade nur auf diesem Gerät gespeichert, bis die Datenbank aktualisiert ist.</p>}

          <button onClick={() => setPflanzenOffen(true)} data-testid="pflanzen-karte"
            className="w-full text-left card space-y-2 hover:border-brand/50 transition-colors" aria-label={`Pflanzen diese Woche: ${pflanzenWoche.stand.anzahl} von ${PFLANZEN_ZIEL}. Öffnen`}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-bold text-text-primary">🌱 Pflanzen diese Woche</h3>
              <span className="text-sm text-text-secondary tabular-nums"><strong className="text-text-primary">{pflanzenWoche.stand.anzahl}</strong> / {PFLANZEN_ZIEL}</span>
            </div>
            <FortschrittsBalken anzahl={pflanzenWoche.stand.anzahl} />
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{pflanzenWoche.stand.anzahl >= PFLANZEN_ZIEL ? 'Wochenziel erreicht.' : `Noch ${PFLANZEN_ZIEL - pflanzenWoche.stand.anzahl} verschiedene Pflanzen bis zum Wochenziel.`}</span>
              <span className="text-brand font-medium flex items-center gap-0.5">Details <ChevronRight size={12} /></span>
            </div>
          </button>

          {stand && heute && (
            <BallaststoffKarte stand={stand} ohneAngabe={heute.ohneAngabe} vorschlaege={vorschlaege} mahlzeit={vorschlagMahlzeit} onOeffnen={oeffnen} />
          )}

          <section aria-label="Kategorien" className="grid grid-cols-2 gap-3">
            {KATEGORIEN.map(k => {
              const anzahl = basis.treffer.filter(t => t.r.mahlzeiten.includes(k.id)).length
              return (
                <button key={k.id} onClick={() => setFilter(f => ({ ...f, mahlzeiten: [k.id] }))}
                  className="text-left rounded-2xl border border-border bg-bg-card p-4 hover:border-brand/50 transition-colors">
                  <div className="text-2xl mb-1" aria-hidden="true">{k.emoji}</div>
                  <div className="font-bold text-text-primary">{k.id}</div>
                  <div className="text-xs text-text-muted">{anzahl} Rezepte</div>
                </button>
              )
            })}
          </section>

          <section aria-label="Darmfreundlich" className="card space-y-3" data-testid="darm-karte">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-bold text-text-primary"><span aria-hidden="true">🫶 </span>Darmfreundlich</h3>
              <button onClick={() => setFilter(f => ({ ...f, gesundheit: ['darm'] }))} className="text-sm text-brand font-medium flex items-center gap-0.5 hover:underline">Alle <ChevronRight size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'probiotisch', emoji: '🥛', text: 'Joghurt, Kefir, Sauerkraut …', zaehlt: (g: Treffer['r']['gesundheit']) => g.probiotisch },
                { id: 'praebiotisch', emoji: '🧅', text: 'Zwiebel, Lauch, Hafer, Topinambur …', zaehlt: (g: Treffer['r']['gesundheit']) => g.praebiotisch },
                { id: 'fermentiert', emoji: '🥬', text: 'Kimchi, Miso, Tempeh, Kefir …', zaehlt: (g: Treffer['r']['gesundheit']) => g.fermentiert },
                { id: 'leicht', emoji: '🍚', text: 'Mild, wenig Fett', zaehlt: (g: Treffer['r']['gesundheit']) => g.leichtVerdaulich },
              ] as const).map(k => {
                const anzahl = basis.treffer.filter(t => k.zaehlt(t.r.gesundheit)).length
                const label = DARM_ARTEN.find(d => d.id === k.id)!.label
                return (
                  <button key={k.id} onClick={() => setFilter(f => ({ ...f, gesundheit: ['darm'], darmArt: k.id }))}
                    className="text-left rounded-2xl border border-border bg-bg-elevated p-3 hover:border-brand/50 transition-colors">
                    <div className="text-xl" aria-hidden="true">{k.emoji}</div>
                    <div className="font-semibold text-sm text-text-primary">{label}</div>
                    <div className="text-[11px] text-text-muted leading-snug">{k.text}</div>
                    <div className="text-xs text-brand mt-1">{anzahl} Rezepte</div>
                  </button>
                )
              })}
            </div>
            <Hinweis />
          </section>

          <section aria-label="Kalorien" className="space-y-2">
            <h3 className="font-bold text-text-primary">🔥 Kalorien pro Portion</h3>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {KCAL_SPANNEN.map(s => (
                <button key={s.id} onClick={() => setFilter(f => ({ ...f, kcal: s.id }))}
                  className="shrink-0 rounded-2xl border border-border bg-bg-card px-4 py-3 text-sm font-semibold text-text-primary hover:border-brand/50">
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <section aria-label="Ernährungsarten" className="space-y-2">
            <h3 className="font-bold text-text-primary">🥦 Ernährungsart</h3>
            <div className="flex flex-wrap gap-2">
              {ARTEN.map(a => (
                <button key={a.id} onClick={() => setFilter(f => ({ ...f, arten: [a.id] }))} title={a.info}
                  className="rounded-full border border-border bg-bg-card px-3.5 py-2 text-sm font-medium text-text-primary hover:border-brand/50">
                  <span aria-hidden="true">{a.emoji} </span>{a.label}
                </button>
              ))}
            </div>
          </section>

          {/* Gesundheit */}
          <section aria-label="Gesundheit" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-bold text-text-primary text-lg">💚 Gesundheit</h3>
              <Hinweis lang />
            </div>
            <Reihe titel={GESUNDHEIT_REIHEN.ballast.label} emoji={GESUNDHEIT_REIHEN.ballast.emoji} items={gesundheitReihen.ballast} gesundheit onOeffnen={oeffnen}
              onAlle={() => setFilter(f => ({ ...f, gesundheit: ['ballast'] }))} />
            <Reihe titel={GESUNDHEIT_REIHEN.aox.label} emoji={GESUNDHEIT_REIHEN.aox.emoji} items={gesundheitReihen.aox} gesundheit onOeffnen={oeffnen}
              onAlle={() => setFilter(f => ({ ...f, gesundheit: ['aox'] }))} />
            <Reihe titel={GESUNDHEIT_REIHEN.darm.label} emoji={GESUNDHEIT_REIHEN.darm.emoji} items={gesundheitReihen.darm} gesundheit onOeffnen={oeffnen}
              leer="Dazu passt gerade kein Rezept."
              onAlle={() => setFilter(f => ({ ...f, gesundheit: ['darm'], darmArt: darmTab === 'alle' ? null : darmTab }))}
              extra={
                <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4" role="group" aria-label="Darmfreundlich: Art">
                  <Chip aktiv={darmTab === 'alle'} onClick={() => setDarmTab('alle')}>Alle</Chip>
                  {DARM_ARTEN.map(d => <Chip key={d.id} aktiv={darmTab === d.id} onClick={() => setDarmTab(d.id)}>{d.label}</Chip>)}
                </div>
              } />
            <Reihe titel={GESUNDHEIT_REIHEN.pflanzen.label} emoji={GESUNDHEIT_REIHEN.pflanzen.emoji} items={gesundheitReihen.pflanzen} gesundheit onOeffnen={oeffnen}
              onAlle={() => setFilter(f => ({ ...f, gesundheit: ['pflanzen'] }))} />
            <Reihe titel={GESUNDHEIT_REIHEN.omega3.label} emoji={GESUNDHEIT_REIHEN.omega3.emoji} items={gesundheitReihen.omega3} gesundheit onOeffnen={oeffnen}
              onAlle={() => setFilter(f => ({ ...f, gesundheit: ['omega3'] }))} />
          </section>

          {/* Reihen */}
          {REIHEN.map(x => (
            <Reihe key={x.id} titel={x.label} emoji={x.emoji} onOeffnen={oeffnen}
              items={basis.treffer.filter(t => t.r.alleReihen.includes(x.id))}
              onAlle={() => setFilter(f => ({ ...f, reihe: x.id }))} />
          ))}

          {/* KI */}
          <section aria-label="KI-Rezepte" className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-text-primary flex-1">✨ Meine KI-Rezepte</h3>
              {ki.rezepte.length > 0 && (
                <button onClick={() => setFilter(f => ({ ...f, nurEigene: true }))} className="text-sm text-brand font-medium flex items-center gap-0.5 hover:underline">Alle <ChevronRight size={14} /></button>
              )}
            </div>
            {ki.rezepte.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x scrollbar-none">
                {basis.treffer.filter(t => t.r.quelle === 'ki').slice(0, 12).map(t => (
                  <div key={t.r.id} className="snap-start"><RezeptKarte t={t} onOpen={() => oeffnen(t)} /></div>
                ))}
              </div>
            )}
            <button onClick={() => setKiOffen(true)} className="w-full rounded-2xl border border-dashed border-brand/50 bg-brand/5 hover:bg-brand/10 transition-colors p-4 flex items-center gap-3 text-left">
              <Sparkles size={20} className="text-brand shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-semibold text-text-primary">Neues Rezept per KI erzeugen</span>
                <span className="block text-xs text-text-secondary">Mit Foto, passend zu Mahlzeit, Ernährungsart und deinen Einschränkungen.</span>
              </span>
            </button>
            {ki.nurLokal && <p className="text-xs text-warning">KI-Rezepte werden gerade nur auf diesem Gerät gespeichert, bis die Datenbank aktualisiert ist.</p>}
          </section>

          {profile?.role === 'coach' && <BilderAdmin />}
        </>
      )}

      {pflanzenOffen && <PflanzenSheet userId={userId} vorschlagsPool={basis.treffer} onOeffnen={oeffnen} onClose={() => setPflanzenOffen(false)} />}
      {einkaufOffen && (
        <EinkaufslisteSheet liste={einkaufsListe} eintraege={einkauf.eintraege} haken={einkauf.haken} nurLokal={einkauf.nurLokal}
          onHaken={einkauf.hakenUmschalten} onEntfernen={id => void einkauf.entfernen(id)} onLeeren={() => void einkauf.leeren()}
          onHakenLoeschen={einkauf.hakenLoeschen} onClose={() => setEinkaufOffen(false)} />
      )}
      {filterOffen && <FilterSheet filter={filter} onChange={setFilter} anzahl={ergebnis.treffer.length} onClose={() => setFilterOffen(false)} />}
      {persoenlichOffen && <PersoenlichSheet einstellungen={einstellungen} anamnese={anamneseTexte} profil={profil ?? (anamneseTexte ? leseAnamnese(anamneseTexte.allergien, anamneseTexte.erkrankungen) : null)} onClose={() => setPersoenlichOffen(false)} />}
      {kiOffen && (
        <KiDialog ausschluesse={einstellungen.ausschluesse} anamnese={profil} speichern={ki.speichern}
          onFertig={id => setOffen({ id })} onClose={() => setKiOffen(false)} />
      )}
      {offenerTreffer && (
        <RezeptDetail t={offenerTreffer} userId={userId} onClose={() => setOffen(null)}
          onLoeschen={offenerTreffer.r.quelle === 'ki' ? () => void ki.loeschen(offenerTreffer.r.id) : undefined} />
      )}
    </div>
    </EinkaufKontext.Provider>
    </FavoritenKontext.Provider>
  )
}

/** Aktive Filter als entfernbare Chips über der Trefferliste */
function FilterChipsZeile({ filter, onChange }: { filter: FilterZustand; onChange: (f: FilterZustand) => void }) {
  const chips: { key: string; text: string; entfernen: () => void }[] = []
  filter.mahlzeiten.forEach(m => chips.push({ key: `m-${m}`, text: m, entfernen: () => onChange({ ...filter, mahlzeiten: filter.mahlzeiten.filter(x => x !== m) }) }))
  if (filter.kcal) chips.push({ key: 'kcal', text: KCAL_SPANNEN.find(s => s.id === filter.kcal)?.label ?? '', entfernen: () => onChange({ ...filter, kcal: null }) })
  filter.arten.forEach(a => chips.push({ key: `a-${a}`, text: ARTEN.find(x => x.id === a)?.label ?? a, entfernen: () => onChange({ ...filter, arten: filter.arten.filter(x => x !== a) }) }))
  if (filter.reihe) chips.push({ key: 'reihe', text: REIHEN.find(x => x.id === filter.reihe)?.label ?? filter.reihe, entfernen: () => onChange({ ...filter, reihe: null }) })
  filter.gesundheit.forEach(g => chips.push({ key: `g-${g}`, text: GESUNDHEIT_REIHEN[g].label, entfernen: () => onChange({ ...filter, gesundheit: filter.gesundheit.filter(x => x !== g), darmArt: g === 'darm' ? null : filter.darmArt }) }))
  if (filter.darmArt) chips.push({ key: 'darm', text: DARM_ARTEN.find(d => d.id === filter.darmArt)?.label ?? '', entfernen: () => onChange({ ...filter, darmArt: null }) })
  if (filter.maxZeit) chips.push({ key: 'zeit', text: `bis ${filter.maxZeit} Min.`, entfernen: () => onChange({ ...filter, maxZeit: null }) })
  if (filter.nurLeicht) chips.push({ key: 'leicht', text: 'Nur leichte', entfernen: () => onChange({ ...filter, nurLeicht: false }) })
  if (filter.nurFavoriten) chips.push({ key: 'fav', text: 'Favoriten', entfernen: () => onChange({ ...filter, nurFavoriten: false }) })
  if (filter.nurEigene) chips.push({ key: 'eigene', text: 'Meine KI-Rezepte', entfernen: () => onChange({ ...filter, nurEigene: false }) })
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="filter-chips">
      {chips.map(c => (
        <button key={c.key} onClick={c.entfernen} className="inline-flex items-center gap-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-medium pl-2.5 pr-1.5 py-1">
          {c.text}<X size={12} aria-label={`${c.text} entfernen`} />
        </button>
      ))}
    </div>
  )
}
