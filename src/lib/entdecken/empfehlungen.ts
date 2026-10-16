// Coach-Empfehlungen: Der Coach empfiehlt Rezepte der Startbibliothek, der Klient sieht sie in „Entdecken“.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

export interface Empfehlung {
  id: string
  rezeptId: string
  rezeptName: string
  notiz: string | null
  gesehenAm: string | null
  erstelltAm: string
}

interface Zeile { id: string; rezept_id: string; rezept_name: string; notiz: string | null; gesehen_am: string | null; created_at: string }
const zuEmpfehlung = (z: Zeile): Empfehlung => ({
  id: z.id, rezeptId: z.rezept_id, rezeptName: z.rezept_name, notiz: z.notiz, gesehenAm: z.gesehen_am, erstelltAm: z.created_at,
})
const SPALTEN = 'id,rezept_id,rezept_name,notiz,gesehen_am,created_at'

function tabelleFehlt(err: { code?: string; message?: string } | null): boolean {
  return !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(err.message ?? ''))
}

/** Empfehlungen, die jünger als 30 Tage sind, zählen als aktuell */
export const AKTUELL_TAGE = 30
export function istAktuell(e: Empfehlung, jetzt = Date.now()): boolean {
  return jetzt - new Date(e.erstelltAm).getTime() < AKTUELL_TAGE * 864e5
}

/** Klient: eigene Empfehlungen lesen und als gesehen markieren */
export function useEmpfehlungen(userId: string) {
  const [liste, setListe] = useState<Empfehlung[]>([])
  const laden = useCallback(async () => {
    const { data, error } = await supabase.from('rezept_empfehlungen').select(SPALTEN).eq('client_id', userId).order('created_at', { ascending: false }).limit(30)
    if (!error && data) setListe((data as Zeile[]).map(zuEmpfehlung))
    else if (tabelleFehlt(error)) setListe([])
  }, [userId])
  useEffect(() => { void laden() }, [laden])

  const alsGesehenMarkieren = useCallback(async (id: string) => {
    const jetzt = new Date().toISOString()
    setListe(prev => prev.map(e => (e.id === id && !e.gesehenAm ? { ...e, gesehenAm: jetzt } : e)))
    await supabase.from('rezept_empfehlungen').update({ gesehen_am: jetzt }).eq('id', id).is('gesehen_am', null)
    window.dispatchEvent(new Event(EMPFEHLUNG_EVENT))
  }, [])
  return { liste, alsGesehenMarkieren }
}

export const EMPFEHLUNG_EVENT = 'hlx:empfehlungen-changed'

/** Anzahl der noch nicht gesehenen aktuellen Empfehlungen (für die Markierung am Tab) */
export function useUngeseheneEmpfehlungen(userId: string | undefined): number {
  const [anzahl, setAnzahl] = useState(0)
  const laden = useCallback(async () => {
    if (!userId) return
    const seit = new Date(Date.now() - AKTUELL_TAGE * 864e5).toISOString()
    const { count, error } = await supabase.from('rezept_empfehlungen').select('id', { count: 'exact', head: true })
      .eq('client_id', userId).is('gesehen_am', null).gte('created_at', seit)
    if (!error && typeof count === 'number') setAnzahl(count)
  }, [userId])
  useEffect(() => {
    void laden()
    window.addEventListener(EMPFEHLUNG_EVENT, laden)
    return () => window.removeEventListener(EMPFEHLUNG_EVENT, laden)
  }, [laden])
  return anzahl
}

/** Coach: Empfehlungen an einen Klienten */
export function useCoachEmpfehlungen(clientId: string) {
  const [liste, setListe] = useState<Empfehlung[]>([])
  const [bereit, setBereit] = useState(false)
  const [fehlt, setFehlt] = useState(false)

  const laden = useCallback(async () => {
    const { data, error } = await supabase.from('rezept_empfehlungen').select(SPALTEN).eq('client_id', clientId).order('created_at', { ascending: false })
    if (tabelleFehlt(error)) setFehlt(true)
    else if (data) setListe((data as Zeile[]).map(zuEmpfehlung))
    setBereit(true)
  }, [clientId])
  useEffect(() => { void laden() }, [laden])

  /** true bei Erfolg. Empfiehlt der Coach dasselbe Rezept erneut, wird die Notiz aktualisiert und es gilt wieder als neu. */
  const empfehlen = useCallback(async (rezeptId: string, rezeptName: string, notiz: string): Promise<boolean> => {
    const sauber = notiz.trim().slice(0, 300) || null
    const coachId = (await supabase.auth.getSession()).data.session?.user.id
    if (!coachId) return false
    const { data, error } = await supabase.from('rezept_empfehlungen')
      .upsert({ coach_id: coachId, client_id: clientId, rezept_id: rezeptId, rezept_name: rezeptName, notiz: sauber, gesehen_am: null, created_at: new Date().toISOString() }, { onConflict: 'coach_id,client_id,rezept_id' })
      .select(SPALTEN).single()
    if (error || !data) return false
    const neu = zuEmpfehlung(data as Zeile)
    setListe(prev => [neu, ...prev.filter(e => e.rezeptId !== rezeptId)])
    return true
  }, [clientId])

  const loeschen = useCallback(async (id: string) => {
    setListe(prev => prev.filter(e => e.id !== id))
    await supabase.from('rezept_empfehlungen').delete().eq('id', id)
  }, [])

  return { liste, bereit, fehlt, empfehlen, loeschen, neuLaden: laden }
}
