// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { supabase } from './supabase'
import { isoWeek } from './game'
import { toLocalISO } from './utils'
import { compressImage } from './images'

export const CHALLENGE_PROOFS_BUCKET = 'challenge-proofs'
export async function fetchChallenges(e) {
  let { data: t, error: n } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', e)
    .order('created_at', {
      ascending: false,
    })
    .limit(300)
  return n ? null : (t ?? [])
}
export function weekCompletedTemplates(e, t) {
  let n = isoWeek(t),
    r = new Set()
  for (let t of e)
    t.status !== 'erledigt' ||
      !t.vorlage_id ||
      !t.erledigt_am ||
      (isoWeek(toLocalISO(new Date(t.erledigt_am))) === n && r.add(t.vorlage_id))
  return r
}
export function createdTodayCount(e, t) {
  return e.filter((e) => !e.coach_id && toLocalISO(new Date(e.created_at)) === t).length
}
export async function uploadProof(e, t, n) {
  let r = await compressImage(n, 1400, 0.82),
    i = `${e}/${t}-${Date.now()}.jpg`
  return (
    await supabase.storage.from('challenge-proofs').upload(i, r, {
      contentType: 'image/jpeg',
      upsert: false,
    })
  ).error
    ? null
    : i
}
export async function proofUrl(e) {
  try {
    let { data: t } = await supabase.storage.from(CHALLENGE_PROOFS_BUCKET).createSignedUrl(e, 3600)
    return t?.signedUrl ?? null
  } catch {
    return null
  }
}
