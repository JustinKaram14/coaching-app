// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { useLocation } from 'react-router-dom'
import { toLocalISO, todayISO } from '../lib/utils'
import { DATA_CHANGED_EVENT, supabase } from '../lib/supabase'

export const MAIN_MEALS = ['Frühstück', 'Mittagessen', 'Abendessen']
export const STATUS_BY_ROUTE = {
  '/weight': 'weight',
  '/sleep': 'sleep',
  '/training': 'training',
  '/nutrition': 'nutrition',
  '/supplements': 'supplements',
}
export function progress(done, total) {
  let clamped = Math.max(0, Math.min(done, total))
  return {
    done: clamped,
    total,
    level: total <= 0 || clamped <= 0 ? 'none' : clamped >= total ? 'done' : 'partial',
  }
}
export const EMPTY_STATUS = {
  weight: progress(0, 1),
  sleep: progress(0, 1),
  training: progress(0, 1),
  nutrition: progress(0, MAIN_MEALS.length),
  supplements: progress(0, 0),
}
export function statusText(key, item) {
  switch (key) {
    case 'weight':
      return item.level === 'done' ? 'heute gewogen' : 'heute noch nicht gewogen'
    case 'sleep':
      return item.level === 'done' ? 'Schlaf heute eingetragen' : 'Schlaf heute noch offen'
    case 'training':
      return item.level === 'done' ? 'heute trainiert' : 'heute noch kein Training'
    case 'nutrition':
      return `${item.done} von ${item.total} Mahlzeiten heute`
    case 'supplements':
      return item.total ? `${item.done} von ${item.total} heute genommen` : 'keine Supplements angelegt'
  }
}
export const DayStatusContext = createContext({
  status: EMPTY_STATUS,
  loaded: false,
  refresh: () => {},
  days: {},
})
export function DayStatusProvider({ children }) {
  let { user, profile } = useAuth(),
    location = useLocation(),
    [status, setStatus] = useState(EMPTY_STATUS),
    [loaded, setLoaded] = useState(false),
    [days, setDays] = useState({}),
    timer = useRef(undefined),
    enabled = !!user && profile?.role !== 'coach',
    load = useCallback(async () => {
      if (!user || !enabled) return
      let e = todayISO(),
        n = new Date()
      n.setDate(n.getDate() - 1)
      let r = [e, toLocalISO(n)],
        i = (e, n) => supabase.from(e).select(n).eq('user_id', user.id).in('datum', r)
      try {
        let [n, o, c, u, d, f, p] = await Promise.all([
            i('gewicht', 'datum'),
            i('schlaf', 'datum'),
            i('training', 'id,datum'),
            i('food_log', 'mahlzeit,datum'),
            supabase.from('supplements').select('id').eq('user_id', user.id).eq('aktiv', true),
            i('supplement_log', 'supplement_id,eingenommen,datum'),
            i('wasser_log', 'menge_ml,datum'),
          ]),
          m = (e) => e.data ?? [],
          h = new Set((d.data ?? []).map((e) => e.id)),
          g = {}
        for (let e of r) {
          let t = new Set(
              m(u)
                .filter((t) => t.datum === e)
                .map((e) => e.mahlzeit),
            ),
            r = new Set(
              m(f)
                .filter((t) => t.datum === e && t.eingenommen && h.has(t.supplement_id))
                .map((e) => e.supplement_id),
            )
          g[e] = {
            date: e,
            mealsMain: MAIN_MEALS.filter((e) => t.has(e)),
            sleep: m(o).some((t) => t.datum === e),
            weight: m(n).some((t) => t.datum === e),
            trainingIds: m(c)
              .filter((t) => t.datum === e)
              .map((e) => e.id),
            supplementsTotal: h.size,
            supplementsTaken: r.size,
            waterMl: m(p)
              .filter((t) => t.datum === e)
              .reduce((e, t) => e + (t.menge_ml ?? 0), 0),
          }
        }
        let _ = g[e]
        ;(setStatus({
          weight: progress(+!!_.weight, 1),
          sleep: progress(+!!_.sleep, 1),
          training: progress(+(_.trainingIds.length > 0), 1),
          nutrition: progress(_.mealsMain.length, MAIN_MEALS.length),
          supplements: progress(_.supplementsTaken, _.supplementsTotal),
        }),
          setDays(g),
          setLoaded(true))
      } catch {}
    }, [user, enabled]),
    scheduleRefresh = useCallback(() => {
      ;(window.clearTimeout(timer.current),
        (timer.current = window.setTimeout(() => {
          load()
        }, 250)))
    }, [load])
  ;(useEffect(() => {
    load()
  }, [load, location.pathname]),
    useEffect(() => {
      window.addEventListener(DATA_CHANGED_EVENT, scheduleRefresh)
      let e = () => {
        document.visibilityState === 'visible' && scheduleRefresh()
      }
      return (
        document.addEventListener('visibilitychange', e),
        () => {
          ;(window.removeEventListener(DATA_CHANGED_EVENT, scheduleRefresh),
            document.removeEventListener('visibilitychange', e),
            window.clearTimeout(timer.current))
        }
      )
    }, [scheduleRefresh]))
  let value = useMemo(
    () => ({
      status: enabled ? status : EMPTY_STATUS,
      loaded: enabled && loaded,
      refresh: scheduleRefresh,
      days,
    }),
    [status, loaded, scheduleRefresh, enabled, days],
  )
  return <DayStatusContext.Provider value={value}>{children}</DayStatusContext.Provider>
}
export function useDayStatus() {
  return useContext(DayStatusContext)
}
