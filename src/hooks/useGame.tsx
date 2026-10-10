// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_CHARACTER, STREAK_BONUS, WELCOME_EVENT, dailyXpEvents, levelInfo, streakEvent } from '../lib/game'
import { useAuth } from './useAuth'
import { useDayStatus } from './useDayStatus'
import { supabase } from '../lib/supabase'
import { isMissingTable } from '../lib/dbErrors'
import { calcStreak, toLocalISO, todayISO } from '../lib/utils'

export const noopFalse = async () => false
export const GameContext = createContext({
  available: false,
  loaded: false,
  character: null,
  stats: {
    xp: 0,
    punkte: 0,
  },
  level: levelInfo(0),
  owned: new Set(),
  toasts: [],
  levelUp: null,
  dismissLevelUp: () => {},
  offerDismissed: true,
  dismissOffer: () => {},
  createCharacter: noopFalse,
  updateCharacter: noopFalse,
  award: async () => [],
  spend: async () => 'Nicht verfügbar',
  redeemReward: async () => ({ error: 'Nicht verfügbar' }),
  buy: async () => 'Nicht verfügbar',
  equip: async () => {},
})
export const eventKey = (event) => `${event.quelle}|${event.ref}`
export const offerKey = (userId) => `hlx-char-offer-${userId}`
export const streakCheckKey = (userId) => `hlx-streak-checked-${userId}`
export function normalizeCharacter(row) {
  return row
    ? {
        name: String(row.name ?? ''),
        config: {
          ...DEFAULT_CHARACTER,
          ...(row.config ?? {}),
        },
        equipped: row.equipped ?? {},
        kennenlernen: row.kennenlernen ?? null,
      }
    : null
}
export function GameProvider({ children }) {
  let { user, profile } = useAuth(),
    { days, loaded: daysLoaded } = useDayStatus(),
    isClient = !!user && profile?.role === 'client',
    [available, setAvailable] = useState(false),
    [loaded, setLoaded] = useState(false),
    [character, setCharacter] = useState(null),
    [stats, setStats] = useState({
      xp: 0,
      punkte: 0,
    }),
    [owned, setOwned] = useState(new Set()),
    [toasts, setToasts] = useState([]),
    [levelUp, setLevelUp] = useState(null),
    [offerDismissed, setOfferDismissed] = useState(true),
    [waterGoalMl, setWaterGoalMl] = useState(0),
    knownEvents = useRef(new Set()),
    statsRef = useRef(stats),
    updateStats = useCallback(
      (change) => ((statsRef.current = change(statsRef.current)), setStats(statsRef.current), statsRef.current),
      [],
    ),
    toastCounter = useRef(0),
    [retryCount, setRetryCount] = useState(0),
    streakCheckedDay = useRef(null)
  useEffect(() => {
    if (!isClient || !user) {
      ;(setAvailable(false), setLoaded(false), setCharacter(null))
      return
    }
    let cancelled = false
    return (
      (async () => {
        let recentSince = new Date(Date.now() - 4 * 864e5).toISOString(),
          [characterResult, statsResult, shopResult, recentEventsResult, settingsResult] = await Promise.all([
            supabase.from('characters').select('*').eq('user_id', user.id).maybeSingle(),
            supabase.from('character_stats').select('xp,punkte').eq('user_id', user.id).maybeSingle(),
            supabase.from('xp_events').select('ref').eq('user_id', user.id).eq('quelle', 'shop'),
            supabase.from('xp_events').select('quelle,ref').eq('user_id', user.id).gte('created_at', recentSince),
            supabase.from('client_settings').select('wasser_ziel_ml').eq('user_id', user.id).maybeSingle(),
          ])
        if (cancelled) return
        if (characterResult.error && isMissingTable(characterResult.error)) {
          ;(setAvailable(false), setLoaded(true))
          return
        }
        if (characterResult.error || statsResult.error) {
          ;(setAvailable(false),
            setLoaded(true),
            retryCount < 3 &&
              window.setTimeout(
                () => {
                  cancelled || setRetryCount((count) => count + 1)
                },
                6e3 * (retryCount + 1),
              ))
          return
        }
        ;(setAvailable(true), setCharacter(normalizeCharacter(characterResult.data)))
        let totals = statsResult.data ?? {}
        ;(updateStats(() => ({
          xp: totals.xp ?? 0,
          punkte: totals.punkte ?? 0,
        })),
          setOwned(new Set((shopResult.data ?? []).map((event) => event.ref))),
          (knownEvents.current = new Set((recentEventsResult.data ?? []).map(eventKey))),
          setWaterGoalMl(settingsResult.data?.wasser_ziel_ml ?? 0))
        try {
          setOfferDismissed(localStorage.getItem(offerKey(user.id)) === '1')
        } catch {
          setOfferDismissed(false)
        }
        setLoaded(true)
      })(),
      () => {
        cancelled = true
      }
    )
  }, [isClient, user, updateStats, retryCount])
  let award = useCallback(
    async (events, options) => {
      if (!user || !events.length) return []
      events.forEach((event) => knownEvents.current.add(eventKey(event)))
      let save = (batch) =>
          supabase
            .from('xp_events')
            .upsert(
              batch.map((event) => ({
                user_id: user.id,
                ...event,
              })),
              {
                onConflict: 'user_id,quelle,ref',
                ignoreDuplicates: true,
              },
            )
            .select('quelle,ref,xp,punkte,titel'),
        batchResult = await save(events),
        saved = []
      if (!batchResult.error) saved = batchResult.data ?? []
      else if (events.length === 1)
        return (batchResult.error.code !== 'P0001' && knownEvents.current.delete(eventKey(events[0])), null)
      else {
        let anyFailed = false
        for (let event of events) {
          let single = await save([event])
          single.error
            ? single.error.code !== 'P0001' && (knownEvents.current.delete(eventKey(event)), (anyFailed = true))
            : saved.push(...(single.data ?? []))
        }
        if (anyFailed && !saved.length) return null
      }
      if (!saved.length) return []
      let gainedXp = saved.reduce((sum, event) => sum + event.xp, 0),
        gainedPunkte = saved.reduce((sum, event) => sum + event.punkte, 0),
        before = statsRef.current,
        after = updateStats((current) => ({
          xp: current.xp + gainedXp,
          punkte: current.punkte + gainedPunkte,
        }))
      if (!options?.silent) {
        let toastId = ++toastCounter.current
        ;(setToasts((current) => [
          ...current.slice(-2),
          {
            id: toastId,
            xp: gainedXp,
            punkte: gainedPunkte,
            titel: saved.map((event) => event.titel),
          },
        ]),
          window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== toastId)), 4200))
        let levelBefore = levelInfo(before.xp).level,
          levelAfter = levelInfo(after.xp).level
        levelAfter > levelBefore && setLevelUp(levelAfter)
      }
      return saved
    },
    [user, updateStats],
  )
  ;(useEffect(() => {
    if (!available || !character || !daysLoaded) return
    let today = todayISO(),
      pending = Object.values(days)
        .flatMap((day) =>
          dailyXpEvents({
            ...day,
            waterGoalMl,
          }).map((event) =>
            day.date === today
              ? event
              : {
                  ...event,
                  titel: `${event.titel} (gestern)`,
                },
          ),
        )
        .concat([WELCOME_EVENT])
        .filter((event) => !knownEvents.current.has(eventKey(event)))
    pending.length && award(pending)
  }, [available, character, daysLoaded, days, waterGoalMl, award]),
    useEffect(() => {
      if (!available || !character || !user || !daysLoaded) return
      let today = todayISO(),
        todayStatus = days[today]
      if (
        !todayStatus ||
        !(todayStatus.weight || todayStatus.sleep || todayStatus.mealsMain.length || todayStatus.trainingIds.length)
      )
        return
      let checkedDay = null
      try {
        checkedDay = localStorage.getItem(streakCheckKey(user.id))
      } catch {}
      checkedDay === today ||
        streakCheckedDay.current === today ||
        ((streakCheckedDay.current = today),
        (async () => {
          let dates = new Set()
          for (let table of ['gewicht', 'schlaf', 'training', 'food_log']) {
            let { data: rows } = await supabase
              .from(table)
              .select('datum')
              .eq('user_id', user.id)
              .order('datum', {
                ascending: false,
              })
              .limit(1e3)
            for (let row of rows ?? []) dates.add(row.datum)
          }
          let streak = calcStreak(dates)
          try {
            localStorage.setItem(streakCheckKey(user.id), today)
          } catch {}
          if (STREAK_BONUS[streak] && dates.has(today)) {
            let startDate = new Date()
            startDate.setDate(startDate.getDate() - (streak - 1))
            let bonusEvent = streakEvent(streak, toLocalISO(startDate))
            bonusEvent && (await award([bonusEvent]))
          }
        })())
    }, [available, character, user, daysLoaded, days, award]))
  let createCharacter = useCallback(
      async (newCharacter) => {
        if (!user) return false
        let { error } = await supabase.from('characters').insert({
          user_id: user.id,
          name: newCharacter.name,
          config: newCharacter.config,
          equipped: newCharacter.equipped,
          kennenlernen: newCharacter.kennenlernen ?? null,
        })
        return error
          ? false
          : (setCharacter(newCharacter),
            await award([WELCOME_EVENT], {
              silent: true,
            }),
            true)
      },
      [user, award],
    ),
    updateCharacter = useCallback(
      async (changes) => {
        if (!user || !character) return false
        let updated = {
          ...character,
          ...changes,
        }
        setCharacter(updated)
        let { error } = await supabase
          .from('characters')
          .update({
            name: updated.name,
            config: updated.config,
            equipped: updated.equipped,
            kennenlernen: updated.kennenlernen ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
        return !error
      },
      [user, character],
    ),
    spend = useCallback(
      async (source, ref, price, title) => {
        if (!user) return 'Nicht angemeldet'
        if (statsRef.current.punkte < price) return 'Dafür reichen deine Punkte noch nicht.'
        let { error } = await supabase.from('xp_events').insert({
          user_id: user.id,
          quelle: source,
          ref,
          xp: 0,
          punkte: -price,
          titel: title,
        })
        return error
          ? /Nicht genug/i.test(error.message)
            ? 'Dafür reichen deine Punkte noch nicht.'
            : 'Das hat nicht geklappt. Versuche es noch einmal.'
          : (updateStats((current) => ({
              ...current,
              punkte: current.punkte - price,
            })),
            null)
      },
      [user, updateStats],
    ),
    // Einlösen läuft in einem Schritt in der Datenbank: Gutschein anlegen und Punkte abziehen, oder beides nicht
    redeemReward = useCallback(
      async (reward) => {
        if (!user) return { error: 'Nicht angemeldet' }
        if (statsRef.current.punkte < reward.preis) return { error: 'Dafür reichen deine Punkte noch nicht.' }
        let { data: voucherId, error } = await supabase.rpc('belohnung_einloesen', { p_belohnung: reward.id })
        if (error || !voucherId)
          return {
            error: /Nicht genug/i.test(error?.message ?? '')
              ? 'Dafür reichen deine Punkte noch nicht.'
              : 'Das hat nicht geklappt. Versuche es noch einmal.',
          }
        updateStats((current) => ({
          ...current,
          punkte: current.punkte - reward.preis,
        }))
        return { id: voucherId }
      },
      [user, updateStats],
    ),
    buy = useCallback(
      async (item) =>
        owned.has(item.id)
          ? 'Das hast du schon.'
          : levelInfo(statsRef.current.xp).level < item.minLevel
            ? `Ab Level ${item.minLevel}.`
            : (await spend('shop', item.id, item.preis, `${item.name} gekauft`)) ||
              (setOwned((current) => new Set(current).add(item.id)), null),
      [owned, spend],
    ),
    equip = useCallback(
      async (equipped) => {
        await updateCharacter({
          equipped,
        })
      },
      [updateCharacter],
    ),
    dismissLevelUp = useCallback(() => setLevelUp(null), []),
    dismissOffer = useCallback(() => {
      if ((setOfferDismissed(true), user))
        try {
          localStorage.setItem(offerKey(user.id), '1')
        } catch {}
    }, [user]),
    value = useMemo(
      () => ({
        available,
        loaded,
        character,
        stats,
        level: levelInfo(stats.xp),
        owned,
        toasts,
        levelUp,
        dismissLevelUp,
        offerDismissed,
        dismissOffer,
        createCharacter,
        updateCharacter,
        award,
        spend,
        redeemReward,
        buy,
        equip,
      }),
      [
        available,
        loaded,
        character,
        stats,
        owned,
        toasts,
        levelUp,
        dismissLevelUp,
        offerDismissed,
        dismissOffer,
        createCharacter,
        updateCharacter,
        award,
        spend,
        redeemReward,
        buy,
        equip,
      ],
    )
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
export function useGame() {
  return useContext(GameContext)
}
