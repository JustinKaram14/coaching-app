import { useEffect, useState } from 'react'
import { DATA_CHANGED_EVENT, supabase } from '../lib/supabase'
import { calcPhysique, type PhysiqueResult } from '../lib/physique'
import { toLocalISO, todayISO } from '../lib/utils'

const PAGE = 1000
const MAX_PAGES = 10
const HISTORY_DAYS = 380

// PostgREST liefert höchstens 1000 Zeilen pro Anfrage, darum seitenweise nachladen
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[] | null> {
  const rows: T[] = []
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE, i * PAGE + PAGE - 1)
    if (error || !data) return null
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

// Körperentwicklung der Figur aus echten Einträgen (Training, Sätze, Mahlzeiten) berechnen.
// Lädt neu, sobald sich Tagesdaten ändern oder ein neuer Tag beginnt.
export function usePhysique(userId: string | null | undefined): PhysiqueResult | null {
  const [result, setResult] = useState<PhysiqueResult | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let timer: number | undefined
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setTick(t => t + 1), 1500)
    }
    window.addEventListener(DATA_CHANGED_EVENT, refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(DATA_CHANGED_EVENT, refresh)
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setResult(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const today = todayISO()
      const since = toLocalISO(new Date(Date.now() - HISTORY_DAYS * 864e5))
      const [trainings, exercises, meals, settings] = await Promise.all([
        fetchAll<{ id: string; datum: string; dauer_min: number | null }>((from, to) =>
          supabase.from('training').select('id,datum,dauer_min').eq('user_id', userId).gte('datum', since).order('datum').range(from, to)),
        fetchAll<{ training_id: string; uebungsname: string; saetze: number | null; wdh: number | null; gewicht_kg: number | null; saetze_log: { wdh: number | null; kg: number | null }[] | null }>((from, to) =>
          supabase.from('uebungen').select('training_id,uebungsname,saetze,wdh,gewicht_kg,saetze_log').eq('user_id', userId).gte('created_at', `${since}T00:00:00`).order('created_at').range(from, to)),
        fetchAll<{ datum: string; mahlzeit: string }>((from, to) =>
          supabase.from('food_log').select('datum,mahlzeit').eq('user_id', userId).gte('datum', since).order('datum').range(from, to)),
        supabase.from('client_settings').select('trainings_pro_woche').eq('user_id', userId).maybeSingle(),
      ])
      if (cancelled || !trainings || !exercises || !meals) return
      setResult(calcPhysique({
        today,
        trainings,
        exercises,
        meals,
        trainingsPerWeek: settings.data?.trainings_pro_woche ?? null,
      }))
    })()
    return () => { cancelled = true }
  }, [userId, tick])

  // Beim Tageswechsel (App bleibt über Mitternacht offen) neu rechnen
  useEffect(() => {
    let day = todayISO()
    const check = () => { if (todayISO() !== day) { day = todayISO(); setTick(t => t + 1) } }
    const timer = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', check) }
  }, [])

  return result
}
