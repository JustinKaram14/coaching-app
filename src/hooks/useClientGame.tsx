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
export function useClientGame(e) {
  let [t, n] = useState(EMPTY_CLIENT_GAME)
  return (
    useEffect(() => {
      if (!e) return
      let t = false
      return (
        (async () => {
          let [r, i] = await Promise.all([
            supabase.from('characters').select('*').eq('user_id', e).maybeSingle(),
            supabase.from('character_stats').select('xp,punkte').eq('user_id', e).maybeSingle(),
          ])
          if (t) return
          if (r.error && isMissingTable(r.error)) {
            n({
              ...EMPTY_CLIENT_GAME,
              loaded: true,
            })
            return
          }
          let a = r.data,
            o = i.data ?? {}
          n({
            loaded: true,
            available: true,
            name: a?.name ?? null,
            config: {
              ...DEFAULT_CHARACTER,
              ...(a?.config ?? {}),
            },
            equipped: a?.equipped ?? {},
            kennenlernen: a?.kennenlernen ?? null,
            xp: o.xp ?? 0,
            punkte: o.punkte ?? 0,
          })
        })(),
        () => {
          t = true
        }
      )
    }, [e]),
    t
  )
}
