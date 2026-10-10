// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { supabase } from './supabase'
import { isoWeek } from './game'
import { toLocalISO } from './utils'
import { compressImage } from './images'

export const CHALLENGE_PROOFS_BUCKET = 'challenge-proofs'
export async function fetchChallenges(userId) {
  let { data: rows, error: queryError } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false,
    })
    .limit(300)
  return queryError ? null : (rows ?? [])
}
export function weekCompletedTemplates(challenges, dateISO) {
  let week = isoWeek(dateISO),
    templates = new Set()
  for (let challenge of challenges)
    challenge.status !== 'erledigt' ||
      !challenge.vorlage_id ||
      !challenge.erledigt_am ||
      (isoWeek(toLocalISO(new Date(challenge.erledigt_am))) === week && templates.add(challenge.vorlage_id))
  return templates
}
export function createdTodayCount(challenges, today) {
  return challenges.filter((challenge) => !challenge.coach_id && toLocalISO(new Date(challenge.created_at)) === today).length
}
export async function uploadProof(userId, challengeId, file) {
  let compressed = await compressImage(file, 1400, 0.82),
    path = `${userId}/${challengeId}-${Date.now()}.jpg`
  return (
    await supabase.storage.from('challenge-proofs').upload(path, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    })
  ).error
    ? null
    : path
}
export async function proofUrl(proofPath) {
  try {
    let { data: signed } = await supabase.storage.from(CHALLENGE_PROOFS_BUCKET).createSignedUrl(proofPath, 3600)
    return signed?.signedUrl ?? null
  } catch {
    return null
  }
}
