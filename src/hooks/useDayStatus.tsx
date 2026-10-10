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
      let today = todayISO(),
        yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      let dayList = [today, toLocalISO(yesterday)],
        query = (table, columns) => supabase.from(table).select(columns).eq('user_id', user.id).in('datum', dayList)
      try {
        let [weightResult, sleepResult, trainingResult, foodResult, suppsResult, suppLogResult, waterResult] = await Promise.all([
            query('gewicht', 'datum'),
            query('schlaf', 'datum'),
            query('training', 'id,datum'),
            query('food_log', 'mahlzeit,datum'),
            supabase.from('supplements').select('id').eq('user_id', user.id).eq('aktiv', true),
            query('supplement_log', 'supplement_id,eingenommen,datum'),
            query('wasser_log', 'menge_ml,datum'),
          ]),
          rowsOf = (result) => result.data ?? [],
          activeSuppIds = new Set((suppsResult.data ?? []).map((supp) => supp.id)),
          byDay = {}
        for (let day of dayList) {
          let meals = new Set(
              rowsOf(foodResult)
                .filter((row) => row.datum === day)
                .map((row) => row.mahlzeit),
            ),
            takenSupps = new Set(
              rowsOf(suppLogResult)
                .filter((row) => row.datum === day && row.eingenommen && activeSuppIds.has(row.supplement_id))
                .map((row) => row.supplement_id),
            )
          byDay[day] = {
            date: day,
            mealsMain: MAIN_MEALS.filter((meal) => meals.has(meal)),
            sleep: rowsOf(sleepResult).some((row) => row.datum === day),
            weight: rowsOf(weightResult).some((row) => row.datum === day),
            trainingIds: rowsOf(trainingResult)
              .filter((row) => row.datum === day)
              .map((row) => row.id),
            supplementsTotal: activeSuppIds.size,
            supplementsTaken: takenSupps.size,
            waterMl: rowsOf(waterResult)
              .filter((row) => row.datum === day)
              .reduce((sum, row) => sum + (row.menge_ml ?? 0), 0),
          }
        }
        let todayStatus = byDay[today]
        ;(setStatus({
          weight: progress(+!!todayStatus.weight, 1),
          sleep: progress(+!!todayStatus.sleep, 1),
          training: progress(+(todayStatus.trainingIds.length > 0), 1),
          nutrition: progress(todayStatus.mealsMain.length, MAIN_MEALS.length),
          supplements: progress(todayStatus.supplementsTaken, todayStatus.supplementsTotal),
        }),
          setDays(byDay),
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
      let onVisibility = () => {
        document.visibilityState === 'visible' && scheduleRefresh()
      }
      return (
        document.addEventListener('visibilitychange', onVisibility),
        () => {
          ;(window.removeEventListener(DATA_CHANGED_EVENT, scheduleRefresh),
            document.removeEventListener('visibilitychange', onVisibility),
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
