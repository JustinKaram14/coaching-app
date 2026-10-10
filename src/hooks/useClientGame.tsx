// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { DEFAULT_CHARACTER } from '../lib/game'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isMissingTable } from '../lib/dbErrors'

export const EMPTY_CLIENT_GAME = {
  loaded: false,
  available: false,
  name: null,
  config: DEFAULT_CHARACTER,
  equipped: {},
  kennenlernen: null,
  xp: 0,
  punkte: 0,
}
export function useClientGame(userId) {
  let [game, setGame] = useState(EMPTY_CLIENT_GAME)
  return (
    useEffect(() => {
      if (!userId) return
      let cancelled = false
      return (
        (async () => {
          let [characterResult, statsResult] = await Promise.all([
            supabase.from('characters').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('character_stats').select('xp,punkte').eq('user_id', userId).maybeSingle(),
          ])
          if (cancelled) return
          if (characterResult.error && isMissingTable(characterResult.error)) {
            setGame({
              ...EMPTY_CLIENT_GAME,
              loaded: true,
            })
            return
          }
          let characterRow = characterResult.data,
            totals = statsResult.data ?? {}
          setGame({
            loaded: true,
            available: true,
            name: characterRow?.name ?? null,
            config: {
              ...DEFAULT_CHARACTER,
              ...(characterRow?.config ?? {}),
            },
            equipped: characterRow?.equipped ?? {},
            kennenlernen: characterRow?.kennenlernen ?? null,
            xp: totals.xp ?? 0,
            punkte: totals.punkte ?? 0,
          })
        })(),
        () => {
          cancelled = true
        }
      )
    }, [userId]),
    game
  )
}
