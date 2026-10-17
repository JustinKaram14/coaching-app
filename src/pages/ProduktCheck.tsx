import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, FileSearch, ScanBarcode, Search, SlidersHorizontal, Star, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { bewerte, stufeFuer, type Bewertung, type Produkt } from '../lib/produktcheck/bewertung'
import { ausDatenbank, ladeProdukt, scanSpeichern, warnungen, type LebensmittelZeile, type Praeferenzen, type Scan } from '../lib/produktcheck/produkt'
import { leseAnamnese } from '../lib/entdecken/filter'
import { useAnamneseTexte } from '../lib/entdecken/daten'
import { BottomSheet } from '../components/ui/BottomSheet'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Methodik, ProduktDetail, Punkt, Punktzahl } from './produktcheck/ProduktDetail'
import { ScannerVollbild } from './produktcheck/ScannerVollbild'
import { AlternativenListe, Uebersicht, letzte30Tage } from './produktcheck/Uebersicht'

interface Ergebnis { produkt: Produkt; bewertung: Bewertung; offline: boolean }
type Liste = 'verlauf' | 'favoriten' | 'alternativen' | 'uebersicht'

const PRAEFERENZEN: { key: keyof Praeferenzen; label: string }[] = [
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarisch', label: 'Vegetarisch' },
  { key: 'ohnePalmoel', label: 'Ohne Palmöl' },
]

export function ProduktCheck() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const anamnese = useAnamneseTexte(userId)
  const profil = useMemo(() => (anamnese ? leseAnamnese(anamnese.allergien, anamnese.erkrankungen) : null), [anamnese])

  const [scanner, setScanner] = useState(false)
  const [eingabe, setEingabe] = useState('')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null)
  const [detailOffen, setDetailOffen] = useState(false)
  const [scans, setScans] = useState<Scan[] | null>(null)
  const [liste, setListe] = useState<Liste>('verlauf')
  const [stufeFilter, setStufeFilter] = useState<string | null>(null)
  const [treffer, setTreffer] = useState<{ produkt: Produkt; bewertung: Bewertung }[] | null>(null)
  const [praef, setPraef] = useState<Praeferenzen>({})
  const [sheet, setSheet] = useState<'praeferenzen' | 'methodik' | null>(null)

  const scansLaden = useCallback(() => {
    supabase.from('produkt_scans').select('*').order('gescannt_am', { ascending: false }).limit(100)
      .then(({ data }) => setScans((data ?? []) as Scan[]))
  }, [])

  useEffect(() => {
    if (!userId) return
    scansLaden()
    supabase.from('client_settings').select('produktcheck_praeferenzen').eq('user_id', userId).maybeSingle()
      .then(({ data }) => setPraef((data?.produktcheck_praeferenzen as Praeferenzen) ?? {}))
  }, [userId, scansLaden])

  const oeffnen = useCallback(async (barcode: string, detail = false) => {
    setLaden(true)
    setFehler('')
    const r = await ladeProdukt(barcode)
    setLaden(false)
    if (!r) {
      setErgebnis(null)
      setFehler(`Produkt ${barcode} nicht gefunden.`)
      return
    }
    const bewertung = bewerte(r.produkt)
    setErgebnis({ ...r, bewertung })
    if (detail) setDetailOffen(true)
    if (userId) scanSpeichern(userId, r.produkt, bewertung.punkte).then(scansLaden)
  }, [userId, scansLaden])

  const erkannt = useCallback((code: string) => { oeffnen(code) }, [oeffnen])

  // Eingabe: Ziffern = Barcode, sonst Produktsuche über die Lebensmittel-Datenbank
  useEffect(() => {
    const q = eingabe.trim()
    if (q.length < 2 || /^\d+$/.test(q)) { setTreffer(null); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('suche_lebensmittel', { q, anzahl: 20 })
      setTreffer(((data ?? []) as LebensmittelZeile[]).map(z => { const produkt = ausDatenbank(z); return { produkt, bewertung: bewerte(produkt) } }))
    }, 400)
    return () => clearTimeout(t)
  }, [eingabe])

  function trefferOeffnen(t: { produkt: Produkt; bewertung: Bewertung }) {
    if (t.produkt.barcode) { oeffnen(t.produkt.barcode, true); return }
    // Grundnahrungsmittel aus dem BLS haben keinen Barcode: direkt aus der Datenbank bewerten
    setErgebnis({ ...t, offline: false })
    setDetailOffen(true)
  }

  async function praefSetzen(key: keyof Praeferenzen, an: boolean) {
    const neu = { ...praef, [key]: an }
    setPraef(neu)
    await supabase.from('client_settings').update({ produktcheck_praeferenzen: neu }).eq('user_id', userId)
  }

  async function favoritUmschalten() {
    if (!ergebnis) return
    const aktuell = scans?.find(s => s.barcode === ergebnis.produkt.barcode)?.favorit ?? false
    await supabase.from('produkt_scans').update({ favorit: !aktuell }).eq('user_id', userId).eq('barcode', ergebnis.produkt.barcode)
    scansLaden()
  }

  const warn = ergebnis ? warnungen(ergebnis.produkt, profil, praef) : []
  const sichtbar = (stufeFilter ? letzte30Tage(scans ?? []) : scans ?? []).filter(s => (liste === 'verlauf' || s.favorit) && (!stufeFilter || (s.punkte != null && stufeFuer(s.punkte).label === stufeFilter)))

  const detail = ergebnis && (
    <BottomSheet open={detailOffen} onClose={() => setDetailOffen(false)} title="Produkt-Check" tall>
      <ProduktDetail
        produkt={ergebnis.produkt} bewertung={ergebnis.bewertung} offline={ergebnis.offline} warnungen={warn}
        favorit={scans?.find(s => s.barcode === ergebnis.produkt.barcode)?.favorit}
        onFavorit={favoritUmschalten}
        onAlternative={code => oeffnen(code, true)}
      />
    </BottomSheet>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title text-2xl flex items-center gap-2"><ScanBarcode size={24} className="text-brand" /> Produkt-Check</h1>
        <p className="text-text-secondary text-sm mt-0.5">Barcode scannen und sehen, wie gesund ein Produkt ist, mit Nährwerten, Zusatzstoffen und besseren Alternativen.</p>
      </div>

      <button onClick={() => { setErgebnis(null); setScanner(true) }} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
        <ScanBarcode size={22} /> Produkt scannen
      </button>

      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (/^\d{8,14}$/.test(eingabe.trim())) oeffnen(eingabe.trim(), true) }}>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input type="search" className="input pl-9" placeholder="Produkt suchen oder Barcode eingeben" value={eingabe} onChange={e => setEingabe(e.target.value)} />
        </div>
        {/^\d+$/.test(eingabe.trim()) && <button className="btn-secondary shrink-0" disabled={!/^\d{8,14}$/.test(eingabe.trim())}>Prüfen</button>}
      </form>
      {treffer && (
        <ul className="card !p-0 divide-y divide-border overflow-hidden -mt-2">
          {treffer.length === 0 && <li className="p-4 text-sm text-text-muted text-center">Keine Produkte gefunden</li>}
          {treffer.map((t, i) => (
            <li key={t.produkt.barcode || i}>
              <button onClick={() => trefferOeffnen(t)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-elevated transition-colors">
                {t.produkt.bild ? <img src={t.produkt.bild} alt="" className="w-10 h-10 rounded-lg object-contain bg-white shrink-0" loading="lazy" /> : <div className="w-10 h-10 rounded-lg bg-bg-elevated shrink-0" />}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-text-primary truncate">{t.produkt.name}</span>
                  {t.produkt.marke && <span className="block text-xs text-text-muted truncate">{t.produkt.marke}</span>}
                </span>
                {t.bewertung.punkte != null && t.bewertung.stufe && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-text-primary shrink-0"><Punkt farbe={t.bewertung.stufe.farbe} size={9} />{t.bewertung.punkte}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {laden && !scanner && <div className="flex justify-center"><Spinner /></div>}
      {fehler && !scanner && <p className="text-sm text-danger text-center">{fehler}</p>}

      <div className="flex gap-2">
        <button onClick={() => setSheet('praeferenzen')} className="flex-1 card !p-3 flex items-center gap-2 text-sm text-text-primary"><SlidersHorizontal size={16} className="text-brand" /> Präferenzen</button>
        <button onClick={() => setSheet('methodik')} className="flex-1 card !p-3 flex items-center gap-2 text-sm text-text-primary"><FileSearch size={16} className="text-brand" /> Bewertungsmethode</button>
      </div>

      <section className="space-y-3">
        <SegmentedTabs tabs={[{ key: 'verlauf', label: 'Verlauf' }, { key: 'favoriten', label: 'Favoriten' }, { key: 'alternativen', label: 'Alternativen' }, { key: 'uebersicht', label: 'Übersicht' }]}
          value={liste} onChange={k => { setListe(k as Liste); setStufeFilter(null) }} label="Gescannte Produkte" className="" />
        {stufeFilter && (
          <button onClick={() => setStufeFilter(null)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-bg-elevated text-text-secondary">
            Nur „{stufeFilter}“ (letzte 30 Tage) <X size={12} />
          </button>
        )}
        {liste === 'uebersicht' ? (scans && <Uebersicht scans={scans} onStufe={stufe => { setStufeFilter(stufe); setListe('verlauf') }} />)
          : liste === 'alternativen' ? (scans && <AlternativenListe scans={scans} onOeffnen={code => oeffnen(code, true)} />)
          : scans === null ? <div className="flex justify-center py-6"><Spinner /></div> : sichtbar.length === 0 ? (
          <EmptyState icon={liste === 'verlauf' ? ScanBarcode : Star} title={liste === 'verlauf' ? 'Noch nichts gescannt' : 'Noch keine Favoriten'}
            description={liste === 'verlauf' ? 'Scanne dein erstes Produkt, es erscheint dann hier.' : 'Markiere Produkte in der Detailansicht mit dem Stern.'} />
        ) : (
          <ul className="card !p-0 divide-y divide-border overflow-hidden">
            {sichtbar.map(s => (
              <li key={s.barcode}>
                <button onClick={() => oeffnen(s.barcode, true)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-elevated transition-colors">
                  {s.bild ? <img src={s.bild} alt="" className="w-12 h-12 rounded-xl object-contain bg-white shrink-0" loading="lazy" /> : <div className="w-12 h-12 rounded-xl bg-bg-elevated shrink-0" />}
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-text-primary truncate">{s.name}</span>
                    {s.marke && <span className="block text-xs text-text-muted truncate">{s.marke}</span>}
                    {s.punkte != null && (
                      <span className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                        <Punkt farbe={stufeFuer(s.punkte).farbe} size={9} /> {s.punkte}/100 · {stufeFuer(s.punkte).label}
                      </span>
                    )}
                  </span>
                  {s.favorit && <Star size={14} className="fill-current text-warning shrink-0" />}
                  <ChevronRight size={16} className="text-text-muted shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {scanner && (
        <ScannerVollbild onErkannt={erkannt} onSchliessen={() => setScanner(false)} pausiert={laden || !!ergebnis || !!fehler}>
          {laden && <div className="rounded-3xl bg-bg-card p-5 flex justify-center"><Spinner /></div>}
          {!laden && fehler && (
            <div className="rounded-3xl bg-bg-card p-4 flex items-center gap-3">
              <p className="flex-1 text-sm text-text-primary">{fehler}</p>
              <button onClick={() => setFehler('')} className="btn-secondary shrink-0">Weiter</button>
            </div>
          )}
          {!laden && ergebnis && (
            <div className="rounded-3xl bg-bg-card p-4 flex items-center gap-3 shadow-card">
              <button onClick={() => setDetailOffen(true)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                {ergebnis.produkt.bild ? <img src={ergebnis.produkt.bild} alt="" className="w-16 h-16 rounded-xl object-contain bg-white shrink-0" /> : <div className="w-16 h-16 rounded-xl bg-bg-elevated shrink-0" />}
                <span className="min-w-0 space-y-1">
                  <span className="block font-bold text-text-primary truncate">{ergebnis.produkt.name}</span>
                  {ergebnis.produkt.marke && <span className="block text-xs text-text-muted truncate">{ergebnis.produkt.marke}</span>}
                  <Punktzahl bewertung={ergebnis.bewertung} />
                </span>
              </button>
              <button onClick={() => setErgebnis(null)} className="p-2 rounded-full bg-bg-elevated text-text-secondary shrink-0" aria-label="Weiter scannen"><X size={18} /></button>
            </div>
          )}
          {detail}
        </ScannerVollbild>
      )}
      {!scanner && detail}

      <BottomSheet open={sheet === 'praeferenzen'} onClose={() => setSheet(null)} title="Persönliche Präferenzen" tall={false}>
        <div className="space-y-4 pb-2">
          <p className="text-sm text-text-secondary">Allergien und Unverträglichkeiten aus deiner Anamnese werden automatisch geprüft{profil?.harte.length ? `: ${profil.harte.map(h => h.label).join(', ')}` : ''}. Zusätzlich kannst du hier wählen:</p>
          {PRAEFERENZEN.map(p => (
            <label key={p.key} className="flex items-center justify-between p-3 rounded-2xl bg-bg-elevated text-sm text-text-primary">
              {p.label}
              <input type="checkbox" className="w-5 h-5 accent-brand" checked={!!praef[p.key]} onChange={e => praefSetzen(p.key, e.target.checked)} />
            </label>
          ))}
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'methodik'} onClose={() => setSheet(null)} title="Bewertungsmethode" tall>
        <Methodik />
      </BottomSheet>
    </div>
  )
}
