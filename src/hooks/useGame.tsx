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
  buy: async () => 'Nicht verfügbar',
  equip: async () => {},
})
export const eventKey = (e) => `${e.quelle}|${e.ref}`
export const offerKey = (e) => `hlx-char-offer-${e}`
export const streakCheckKey = (e) => `hlx-streak-checked-${e}`
export function normalizeCharacter(e) {
  return e
    ? {
        name: String(e.name ?? ''),
        config: {
          ...DEFAULT_CHARACTER,
          ...(e.config ?? {}),
        },
        equipped: e.equipped ?? {},
        kennenlernen: e.kennenlernen ?? null,
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
      (e) => ((statsRef.current = e(statsRef.current)), setStats(statsRef.current), statsRef.current),
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
    let e = false
    return (
      (async () => {
        let n = new Date(Date.now() - 4 * 864e5).toISOString(),
          [r, i, a, o, c] = await Promise.all([
            supabase.from('characters').select('*').eq('user_id', user.id).maybeSingle(),
            supabase.from('character_stats').select('xp,punkte').eq('user_id', user.id).maybeSingle(),
            supabase.from('xp_events').select('ref').eq('user_id', user.id).eq('quelle', 'shop'),
            supabase.from('xp_events').select('quelle,ref').eq('user_id', user.id).gte('created_at', n),
            supabase.from('client_settings').select('wasser_ziel_ml').eq('user_id', user.id).maybeSingle(),
          ])
        if (e) return
        if (r.error && isMissingTable(r.error)) {
          ;(setAvailable(false), setLoaded(true))
          return
        }
        if (r.error || i.error) {
          ;(setAvailable(false),
            setLoaded(true),
            retryCount < 3 &&
              window.setTimeout(
                () => {
                  e || setRetryCount((e) => e + 1)
                },
                6e3 * (retryCount + 1),
              ))
          return
        }
        ;(setAvailable(true), setCharacter(normalizeCharacter(r.data)))
        let u = i.data ?? {}
        ;(updateStats(() => ({
          xp: u.xp ?? 0,
          punkte: u.punkte ?? 0,
        })),
          setOwned(new Set((a.data ?? []).map((e) => e.ref))),
          (knownEvents.current = new Set((o.data ?? []).map(eventKey))),
          setWaterGoalMl(c.data?.wasser_ziel_ml ?? 0))
        try {
          setOfferDismissed(localStorage.getItem(offerKey(user.id)) === '1')
        } catch {
          setOfferDismissed(false)
        }
        setLoaded(true)
      })(),
      () => {
        e = true
      }
    )
  }, [isClient, user, updateStats, retryCount])
  let award = useCallback(
    async (e, n) => {
      if (!user || !e.length) return []
      e.forEach((e) => knownEvents.current.add(eventKey(e)))
      let r = (e) =>
          supabase
            .from('xp_events')
            .upsert(
              e.map((e) => ({
                user_id: user.id,
                ...e,
              })),
              {
                onConflict: 'user_id,quelle,ref',
                ignoreDuplicates: true,
              },
            )
            .select('quelle,ref,xp,punkte,titel'),
        i = await r(e),
        a = []
      if (!i.error) a = i.data ?? []
      else if (e.length === 1) return (i.error.code !== 'P0001' && knownEvents.current.delete(eventKey(e[0])), null)
      else {
        let t = false
        for (let n of e) {
          let e = await r([n])
          e.error
            ? e.error.code !== 'P0001' && (knownEvents.current.delete(eventKey(n)), (t = true))
            : a.push(...(e.data ?? []))
        }
        if (t && !a.length) return null
      }
      if (!a.length) return []
      let o = a.reduce((e, t) => e + t.xp, 0),
        s = a.reduce((e, t) => e + t.punkte, 0),
        c = statsRef.current,
        l = updateStats((e) => ({
          xp: e.xp + o,
          punkte: e.punkte + s,
        }))
      if (!n?.silent) {
        let e = ++toastCounter.current
        ;(setToasts((t) => [
          ...t.slice(-2),
          {
            id: e,
            xp: o,
            punkte: s,
            titel: a.map((e) => e.titel),
          },
        ]),
          window.setTimeout(() => setToasts((t) => t.filter((t) => t.id !== e)), 4200))
        let t = levelInfo(c.xp).level,
          n = levelInfo(l.xp).level
        n > t && setLevelUp(n)
      }
      return a
    },
    [user, updateStats],
  )
  ;(useEffect(() => {
    if (!available || !character || !daysLoaded) return
    let e = todayISO(),
      t = Object.values(days)
        .flatMap((t) =>
          dailyXpEvents({
            ...t,
            waterGoalMl,
          }).map((n) =>
            t.date === e
              ? n
              : {
                  ...n,
                  titel: `${n.titel} (gestern)`,
                },
          ),
        )
        .concat([WELCOME_EVENT])
        .filter((e) => !knownEvents.current.has(eventKey(e)))
    t.length && award(t)
  }, [available, character, daysLoaded, days, waterGoalMl, award]),
    useEffect(() => {
      if (!available || !character || !user || !daysLoaded) return
      let e = todayISO(),
        n = days[e]
      if (!n || !(n.weight || n.sleep || n.mealsMain.length || n.trainingIds.length)) return
      let a = null
      try {
        a = localStorage.getItem(streakCheckKey(user.id))
      } catch {}
      a === e ||
        streakCheckedDay.current === e ||
        ((streakCheckedDay.current = e),
        (async () => {
          let n = new Set()
          for (let e of ['gewicht', 'schlaf', 'training', 'food_log']) {
            let { data: r } = await supabase
              .from(e)
              .select('datum')
              .eq('user_id', user.id)
              .order('datum', {
                ascending: false,
              })
              .limit(1e3)
            for (let e of r ?? []) n.add(e.datum)
          }
          let r = calcStreak(n)
          try {
            localStorage.setItem(streakCheckKey(user.id), e)
          } catch {}
          if (STREAK_BONUS[r] && n.has(e)) {
            let e = new Date()
            e.setDate(e.getDate() - (r - 1))
            let t = streakEvent(r, toLocalISO(e))
            t && (await award([t]))
          }
        })())
    }, [available, character, user, daysLoaded, days, award]))
  let createCharacter = useCallback(
      async (e) => {
        if (!user) return false
        let { error: n } = await supabase.from('characters').insert({
          user_id: user.id,
          name: e.name,
          config: e.config,
          equipped: e.equipped,
          kennenlernen: e.kennenlernen ?? null,
        })
        return n
          ? false
          : (setCharacter(e),
            await award([WELCOME_EVENT], {
              silent: true,
            }),
            true)
      },
      [user, award],
    ),
    updateCharacter = useCallback(
      async (e) => {
        if (!user || !character) return false
        let n = {
          ...character,
          ...e,
        }
        setCharacter(n)
        let { error: r } = await supabase
          .from('characters')
          .update({
            name: n.name,
            config: n.config,
            equipped: n.equipped,
            kennenlernen: n.kennenlernen ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
        return !r
      },
      [user, character],
    ),
    spend = useCallback(
      async (e, n, r, i) => {
        if (!user) return 'Nicht angemeldet'
        if (statsRef.current.punkte < r) return 'Dafür reichen deine Punkte noch nicht.'
        let { error: a } = await supabase.from('xp_events').insert({
          user_id: user.id,
          quelle: e,
          ref: n,
          xp: 0,
          punkte: -r,
          titel: i,
        })
        return a
          ? /Nicht genug/i.test(a.message)
            ? 'Dafür reichen deine Punkte noch nicht.'
            : 'Das hat nicht geklappt. Versuche es noch einmal.'
          : (updateStats((e) => ({
              ...e,
              punkte: e.punkte - r,
            })),
            null)
      },
      [user, updateStats],
    ),
    buy = useCallback(
      async (e) =>
        owned.has(e.id)
          ? 'Das hast du schon.'
          : levelInfo(statsRef.current.xp).level < e.minLevel
            ? `Ab Level ${e.minLevel}.`
            : (await spend('shop', e.id, e.preis, `${e.name} gekauft`)) ||
              (setOwned((t) => new Set(t).add(e.id)), null),
      [owned, spend],
    ),
    equip = useCallback(
      async (e) => {
        await updateCharacter({
          equipped: e,
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
        buy,
        equip,
      ],
    )
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
export function useGame() {
  return useContext(GameContext)
}
