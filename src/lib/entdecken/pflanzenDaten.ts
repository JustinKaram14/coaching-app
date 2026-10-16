// Datenzugriff fürs Wochenziel „30 Pflanzen“. Fehlt die Tabelle noch, wird lokal gespeichert.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { wochenEnde, wochenStand, type Pflanze, type PflanzenZeile } from './pflanzen'

export const PFLANZEN_EVENT = 'hlx:pflanzen-changed'

function tabelleFehlt(err: { code?: string; message?: string } | null): boolean {
  return !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(err.message ?? ''))
}

const keyLokal = (userId: string) => `entdecken_pflanzen_${userId}`
function lokalLesen(userId: string): PflanzenZeile[] {
  try { return JSON.parse(localStorage.getItem(keyLokal(userId)) ?? '[]') as PflanzenZeile[] } catch { return [] }
}
function lokalSchreiben(userId: string, zeilen: PflanzenZeile[]) {
  try { localStorage.setItem(keyLokal(userId), JSON.stringify(zeilen)) } catch { /* ohne Speicher weiter */ }
}

/** Trägt Pflanzen für einen Tag ein (mehrfach ist harmlos: pro Tag zählt jede Pflanze einmal) */
export async function schreibePflanzen(userId: string, pflanzen: Pflanze[], datum: string, quelle: 'rezept' | 'manuell'): Promise<boolean> {
  if (pflanzen.length === 0) return true
  const zeilen = pflanzen.map(p => ({ user_id: userId, datum, pflanze: p.key, name: p.name, quelle }))
  const { error } = await supabase.from('pflanzen_log').upsert(zeilen, { onConflict: 'user_id,datum,pflanze', ignoreDuplicates: true })
  let ok = !error
  if (tabelleFehlt(error)) {
    const vorhanden = lokalLesen(userId)
    const neu = pflanzen.filter(p => !vorhanden.some(v => v.datum === datum && v.pflanze === p.key))
    lokalSchreiben(userId, [...vorhanden, ...neu.map(p => ({ datum, pflanze: p.key, name: p.name, quelle }))])
    ok = true
  }
  if (ok) window.dispatchEvent(new Event(PFLANZEN_EVENT))
  return ok
}

export function usePflanzen(userId: string, wochenStartDatum: string) {
  const ende = wochenEnde(wochenStartDatum)
  const [zeilen, setZeilen] = useState<PflanzenZeile[]>([])
  const [laden, setLaden] = useState(true)
  const [nurLokal, setNurLokal] = useState(false)

  // Mehrere Ladevorgänge können sich überholen: nur das Ergebnis des letzten gilt
  const ladeNr = useRef(0)

  const neuLaden = useCallback(async () => {
    const nr = ++ladeNr.current
    const { data, error } = await supabase.from('pflanzen_log').select('datum,pflanze,name,quelle')
      .eq('user_id', userId).gte('datum', wochenStartDatum).lte('datum', ende)
    if (nr !== ladeNr.current) return
    if (tabelleFehlt(error)) {
      setNurLokal(true)
      setZeilen(lokalLesen(userId).filter(z => z.datum >= wochenStartDatum && z.datum <= ende))
    } else if (data) {
      setNurLokal(false)
      setZeilen(data as PflanzenZeile[])
    }
    setLaden(false)
  }, [userId, wochenStartDatum, ende])

  useEffect(() => {
    setLaden(true)
    void neuLaden()
    window.addEventListener(PFLANZEN_EVENT, neuLaden)
    return () => window.removeEventListener(PFLANZEN_EVENT, neuLaden)
  }, [neuLaden])

  /** Nimmt eine Pflanze aus der ganzen Woche */
  const entfernen = useCallback(async (key: string) => {
    setZeilen(prev => prev.filter(z => z.pflanze !== key))
    const { error } = await supabase.from('pflanzen_log').delete().eq('user_id', userId).eq('pflanze', key).gte('datum', wochenStartDatum).lte('datum', ende)
    if (tabelleFehlt(error)) {
      lokalSchreiben(userId, lokalLesen(userId).filter(z => !(z.pflanze === key && z.datum >= wochenStartDatum && z.datum <= ende)))
    }
  }, [userId, wochenStartDatum, ende])

  const stand = useMemo(() => wochenStand(zeilen), [zeilen])
  return { stand, laden, nurLokal, entfernen, neuLaden }
}
