// Datenzugriff für „Entdecken“: Ausschlussliste, Schalter, KI-Rezepte und das Ernährungs-Tagebuch.
// Fehlen die neuen Tabellen noch (Migration nicht eingespielt), arbeitet die App lokal weiter und weist darauf hin.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { berechneRezept, naehrwerteFuerMenge, type MengenModus } from './engine'
import type { Ausschluss, AusschlussArt, Mahlzeit, Rezept, RezeptDef } from './types'
import { START_REZEPTE } from './startbibliothek'
import { ZUTATEN } from './zutaten'
import { toLocalISO } from '../utils'

function istTabelleFehlt(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return err.code === '42P01' || err.code === 'PGRST205' || err.code === '42703' || /does not exist|schema cache/i.test(err.message ?? '')
}

const lokal = {
  lesen<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
  },
  schreiben(key: string, wert: unknown) {
    try { localStorage.setItem(key, JSON.stringify(wert)) } catch { /* ohne Speicher weiter */ }
  },
}

// ─── Persönliche Einstellungen: Ausschlussliste und Anamnese-Schalter ────────

export function usePersoenlich(userId: string) {
  const keyListe = `entdecken_ausschluesse_${userId}`
  const keySchalter = `entdecken_anamnese_${userId}`
  const [ausschluesse, setAusschluesse] = useState<Ausschluss[]>(() => lokal.lesen(keyListe, []))
  const [anamneseFilter, setAnamneseFilterState] = useState<boolean>(() => lokal.lesen(keySchalter, false))
  const [nurLokal, setNurLokal] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    let aktiv = true
    async function laden() {
      const [liste, praef] = await Promise.all([
        supabase.from('rezept_ausschluesse').select('id,begriff,art').eq('user_id', userId).order('created_at'),
        supabase.from('rezept_praeferenzen').select('anamnese_filter').eq('user_id', userId).maybeSingle(),
      ])
      if (!aktiv) return
      if (istTabelleFehlt(liste.error) || istTabelleFehlt(praef.error)) { setNurLokal(true); return }
      if (liste.data) { setAusschluesse(liste.data as Ausschluss[]); lokal.schreiben(keyListe, liste.data) }
      if (praef.data) { setAnamneseFilterState(!!praef.data.anamnese_filter); lokal.schreiben(keySchalter, !!praef.data.anamnese_filter) }
    }
    void laden()
    return () => { aktiv = false }
  }, [userId, keyListe, keySchalter])

  const hinzufuegen = useCallback(async (begriff: string, art: AusschlussArt): Promise<boolean> => {
    const text = begriff.trim().slice(0, 60)
    if (text.length < 2) { setFehler('Bitte mindestens 2 Zeichen eingeben.'); return false }
    if (ausschluesse.some(a => a.begriff.toLowerCase() === text.toLowerCase())) { setFehler('Dieser Begriff steht schon in der Liste.'); return false }
    setFehler('')
    const { data, error } = await supabase.from('rezept_ausschluesse')
      .insert({ user_id: userId, begriff: text, art }).select('id,begriff,art').single()
    let neu: Ausschluss
    if (error && istTabelleFehlt(error)) {
      setNurLokal(true)
      neu = { id: `lokal-${Date.now()}`, begriff: text, art }
    } else if (error || !data) {
      setFehler('Das Speichern hat nicht geklappt. Bitte versuche es noch einmal.')
      return false
    } else {
      neu = data as Ausschluss
    }
    setAusschluesse(prev => { const next = [...prev, neu]; lokal.schreiben(keyListe, next); return next })
    return true
  }, [ausschluesse, userId, keyListe])

  const entfernen = useCallback(async (id: string) => {
    setAusschluesse(prev => { const next = prev.filter(a => a.id !== id); lokal.schreiben(keyListe, next); return next })
    if (!id.startsWith('lokal-')) await supabase.from('rezept_ausschluesse').delete().eq('id', id)
  }, [keyListe])

  const artAendern = useCallback(async (id: string, art: AusschlussArt) => {
    setAusschluesse(prev => { const next = prev.map(a => (a.id === id ? { ...a, art } : a)); lokal.schreiben(keyListe, next); return next })
    if (!id.startsWith('lokal-')) await supabase.from('rezept_ausschluesse').update({ art }).eq('id', id)
  }, [keyListe])

  const setAnamneseFilter = useCallback(async (an: boolean) => {
    setAnamneseFilterState(an)
    lokal.schreiben(keySchalter, an)
    const { error } = await supabase.from('rezept_praeferenzen')
      .upsert({ user_id: userId, anamnese_filter: an, updated_at: new Date().toISOString() })
    if (istTabelleFehlt(error)) setNurLokal(true)
  }, [userId, keySchalter])

  return { ausschluesse, anamneseFilter, setAnamneseFilter, hinzufuegen, entfernen, artAendern, nurLokal, fehler, setFehler }
}

// ─── Anamnese-Texte (Allergien, Erkrankungen) ────────────────────────────────

export interface AnamneseTexte { allergien: string; erkrankungen: string; ausgefuellt: boolean }

export function useAnamneseTexte(userId: string): AnamneseTexte | null {
  const [texte, setTexte] = useState<AnamneseTexte | null>(null)
  useEffect(() => {
    let aktiv = true
    supabase.from('client_settings').select('ernaehrungs_notizen').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (!aktiv) return
      const roh = (data as { ernaehrungs_notizen?: string | null } | null)?.ernaehrungs_notizen
      try {
        const j = roh ? JSON.parse(roh) as Record<string, unknown> : {}
        const allergien = typeof j.allergien === 'string' ? j.allergien : ''
        const erkrankungen = typeof j.erkrankungen === 'string' ? j.erkrankungen : ''
        setTexte({ allergien, erkrankungen, ausgefuellt: !!(j.anamnese_done && !j.skipped) })
      } catch {
        setTexte({ allergien: '', erkrankungen: '', ausgefuellt: false })
      }
    })
    return () => { aktiv = false }
  }, [userId])
  return texte
}

// ─── KI-Rezepte ──────────────────────────────────────────────────────────────

interface KiZeile { id: string; daten: RezeptDef; bild_url: string | null }

/** Prüft, dass eine (KI-)Rezeptdefinition nur bekannte Zutaten nutzt und brauchbar ist */
export function bereinigeDef(roh: unknown, id: string): RezeptDef | null {
  if (!roh || typeof roh !== 'object') return null
  const d = roh as Partial<RezeptDef>
  const zutaten = (d.zutaten ?? []).filter(z => z && ZUTATEN[z.id] && Number(z.g) > 0).map(z => ({ id: z.id, g: Math.min(2000, Math.round(Number(z.g) * 10) / 10) }))
  const schritte = (d.schritte ?? []).map(s => String(s).trim()).filter(Boolean)
  if (!d.name || zutaten.length < 2 || schritte.length < 2) return null
  const mahlzeiten = (d.mahlzeiten ?? []).filter((m): m is Mahlzeit => ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack'].includes(m as string))
  return {
    id,
    name: String(d.name).slice(0, 80),
    beschreibung: d.beschreibung ? String(d.beschreibung).slice(0, 300) : undefined,
    mahlzeiten: mahlzeiten.length ? mahlzeiten : ['Mittagessen'],
    reihen: (d.reihen ?? []).filter(r => ['salat', 'suppe', 'bowl', 'pfanne', 'ofen', 'suess', 'meal-prep'].includes(r)),
    zeitMin: Math.min(240, Math.max(5, Math.round(Number(d.zeitMin) || 30))),
    schwierigkeit: ([1, 2, 3].includes(Number(d.schwierigkeit)) ? Number(d.schwierigkeit) : 2) as 1 | 2 | 3,
    portionen: Math.min(8, Math.max(1, Math.round(Number(d.portionen) || 1))),
    zutaten,
    schritte: schritte.slice(0, 12).map(s => s.slice(0, 400)),
    quelle: 'ki',
  }
}

export function useKiRezepte(userId: string) {
  const [zeilen, setZeilen] = useState<KiZeile[]>([])
  const [nurLokal, setNurLokal] = useState(false)
  const key = `entdecken_ki_${userId}`

  useEffect(() => {
    let aktiv = true
    supabase.from('entdecken_rezepte').select('id,daten,bild_url').eq('user_id', userId).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!aktiv) return
      if (istTabelleFehlt(error)) { setNurLokal(true); setZeilen(lokal.lesen(key, [])); return }
      setZeilen((data ?? []) as KiZeile[])
    })
    return () => { aktiv = false }
  }, [userId, key])

  const rezepte: Rezept[] = useMemo(() => zeilen.flatMap(z => {
    const def = bereinigeDef(z.daten, z.id)
    return def ? [{ ...berechneRezept(def), bildUrl: z.bild_url }] : []
  }), [zeilen])

  const speichern = useCallback(async (def: RezeptDef, bildUrl: string | null): Promise<string | null> => {
    const { data, error } = await supabase.from('entdecken_rezepte')
      .insert({ user_id: userId, daten: def, bild_url: bildUrl }).select('id,daten,bild_url').single()
    let zeile: KiZeile
    if (error && istTabelleFehlt(error)) {
      setNurLokal(true)
      zeile = { id: def.id, daten: def, bild_url: bildUrl }
      lokal.schreiben(key, [zeile, ...lokal.lesen<KiZeile[]>(key, [])])
    } else if (error || !data) {
      return null
    } else {
      zeile = data as KiZeile
    }
    setZeilen(prev => [zeile, ...prev])
    return zeile.id
  }, [userId, key])

  const loeschen = useCallback(async (id: string) => {
    setZeilen(prev => { const next = prev.filter(z => z.id !== id); if (nurLokal) lokal.schreiben(key, next); return next })
    if (!nurLokal) await supabase.from('entdecken_rezepte').delete().eq('id', id)
  }, [nurLokal, key])

  return { rezepte, speichern, loeschen, nurLokal }
}

// ─── Startbibliothek mit Bildern ─────────────────────────────────────────────

/** Fotos liegen öffentlich im Bucket „rezept-bilder“ unter start/<id>.jpg */
export const STARTBIBLIOTHEK: Rezept[] = START_REZEPTE.map(r => ({
  ...r,
  bildUrl: supabase.storage.from('rezept-bilder').getPublicUrl(`start/${r.id}.jpg`).data.publicUrl,
}))

// ─── Tagebuch ────────────────────────────────────────────────────────────────

export interface TagebuchEintrag {
  datum: string
  mahlzeit: Mahlzeit
  modus: MengenModus
  menge: number
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Trägt ein Rezept in das Ernährungs-Tagebuch ein. Ist die Spalte für Ballaststoffe noch nicht da, wird ohne sie gespeichert. */
export async function eintragenInTagebuch(userId: string, r: Rezept, e: TagebuchEintrag): Promise<{ ok: boolean; ohneBallaststoffe: boolean }> {
  const { n, gramm } = naehrwerteFuerMenge(r, e.modus, e.menge)
  const zeile = {
    user_id: userId, datum: e.datum, mahlzeit: e.mahlzeit, name: r.name,
    menge_g: gramm, kalorien: Math.round(n.kcal), protein_g: r1(n.protein),
    kohlenhydrate_g: r1(n.kh), fett_g: r1(n.fett),
  }
  const { error } = await supabase.from('food_log').insert({ ...zeile, ballaststoffe_g: r1(n.ballast) })
  if (!error) return { ok: true, ohneBallaststoffe: false }
  if (istTabelleFehlt(error) || /ballaststoffe_g/.test(error.message)) {
    const { error: zweiter } = await supabase.from('food_log').insert(zeile)
    return { ok: !zweiter, ohneBallaststoffe: !zweiter }
  }
  return { ok: false, ohneBallaststoffe: false }
}

/** Heutiger Stand aus dem Tagebuch für die Ballaststoff-Anzeige */
export async function ladeHeute(userId: string): Promise<{ ballast: number; kcal: number; belegt: Mahlzeit[]; ohneAngabe: number; kcalZiel: number }> {
  const heute = toLocalISO(new Date())
  const [log, ziel] = await Promise.all([
    supabase.from('food_log').select('*').eq('user_id', userId).eq('datum', heute),
    supabase.from('client_settings').select('kalorie_tagesziel').eq('user_id', userId).maybeSingle(),
  ])
  const zeilen = (log.data ?? []) as { mahlzeit: Mahlzeit; kalorien: number | null; ballaststoffe_g?: number | null }[]
  return {
    ballast: r1(zeilen.reduce((s, z) => s + (z.ballaststoffe_g ?? 0), 0)),
    kcal: Math.round(zeilen.reduce((s, z) => s + (z.kalorien ?? 0), 0)),
    belegt: [...new Set(zeilen.map(z => z.mahlzeit))],
    ohneAngabe: zeilen.filter(z => z.ballaststoffe_g == null).length,
    kcalZiel: (ziel.data as { kalorie_tagesziel?: number | null } | null)?.kalorie_tagesziel ?? 2000,
  }
}
