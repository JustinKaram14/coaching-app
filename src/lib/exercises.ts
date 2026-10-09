// Lokale Übungsdatenbank (deutsch). Quelle: public/exercises/data/exercises_de.json
import { supabase } from './supabase'

export interface LocalExercise {
  id: string
  name: string
  name_en: string
  category: string
  body_part: string
  equipment: string
  instructions: string
  instruction_steps: string[]
  muscle_group: string
  secondary_muscles: string[]
  target: string
  image: string
  gif_url: string
  group: string
  compound: number
  stretch: number
  equipment_group: string
}

interface RawExercise {
  id: string
  name: string
  name_en?: string
  body_part_de?: string
  equipment_de?: string
  equipment_group?: string
  target_de?: string
  secondary_de?: string[]
  steps?: string[]
  group?: string
  compound?: number
  stretch?: number
  image?: string
  gif?: string
}

export const EX_BASE = import.meta.env.BASE_URL + 'exercises/'

let cache: Promise<LocalExercise[]> | null = null

export function loadLocalExercises(): Promise<LocalExercise[]> {
  cache ??= fetch(EX_BASE + 'data/exercises_de.json')
    .then(r => (r.ok ? r.json() : []))
    .then((raw: RawExercise[]) => raw.map(toLocal))
    .catch(() => {
      cache = null
      return []
    })
  return cache
}

function toLocal(r: RawExercise): LocalExercise {
  const steps = r.steps ?? []
  return {
    id: r.id,
    name: r.name,
    name_en: r.name_en ?? '',
    category: r.body_part_de ?? '',
    body_part: r.body_part_de ?? '',
    equipment: r.equipment_de ?? '',
    instructions: steps.join(' '),
    instruction_steps: steps,
    muscle_group: r.target_de ?? '',
    secondary_muscles: r.secondary_de ?? [],
    target: r.target_de ?? '',
    image: r.image ?? '',
    gif_url: r.gif ?? '',
    group: r.group ?? '',
    compound: r.compound ?? 0,
    stretch: r.stretch ?? 0,
    equipment_group: r.equipment_group ?? '',
  }
}

// Eigene Übungen: Namen, die der Nutzer schon in Plänen oder Trainings verwendet hat und die nicht im Übungspool stehen.
// Sie brauchen keine eigene Tabelle: Sobald ein Plan oder Training mit dem Namen gespeichert ist, wird er wieder vorgeschlagen.
let ownCache: { userId: string; at: number; promise: Promise<string[]> } | null = null

// Nach dem Speichern eines Plans oder Trainings aufrufen, damit neue eigene Übungen sofort vorgeschlagen werden
export function resetMyExerciseNames() {
  ownCache = null
}

export function loadMyExerciseNames(userId: string, pool: LocalExercise[]): Promise<string[]> {
  if (ownCache && ownCache.userId === userId && Date.now() - ownCache.at < 20_000) return ownCache.promise
  const promise = (async () => {
    const [{ data: logged }, { data: vorlagen }] = await Promise.all([
      supabase.from('uebungen').select('uebungsname').eq('user_id', userId).limit(2000),
      supabase.from('training_vorlagen').select('id').eq('user_id', userId),
    ])
    const ids = (vorlagen ?? []).map(v => v.id as string)
    const { data: planned } = ids.length
      ? await supabase.from('vorlagen_uebungen').select('uebungsname').in('vorlage_id', ids)
      : { data: [] as { uebungsname: string }[] }

    const seen = new Map<string, string>()
    for (const row of [...(logged ?? []), ...(planned ?? [])]) {
      const name = String(row.uebungsname ?? '').trim()
      const key = norm(name)
      if (!key || seen.has(key)) continue
      if (pool.length > 0 && findLocalExercise(name, pool)) continue
      seen.set(key, name)
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'de'))
  })().catch(() => [] as string[])
  ownCache = { userId, at: Date.now(), promise }
  return promise
}

// Kleinbuchstaben, ohne Akzente und Umlaute-Unterschiede ("Rücken" findet "rucken" und "ruecken")
export function norm(s: string | undefined | null): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Alle Suchwörter müssen irgendwo in Name, englischem Namen, Muskel, Gerät oder Körperteil vorkommen
export function matchesExercise(ex: LocalExercise, query: string): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = norm(`${ex.name} ${ex.name_en} ${ex.target} ${ex.equipment} ${ex.body_part}`)
  return words.every(w => hay.includes(w))
}

// Deutsche Kurznamen, die in älteren Einheiten gespeichert sind, auf den englischen Namen der Datenbank
const DE_TO_EN_EX: Record<string, string> = {
  'seitheben': 'side lateral raise',
  'bankdrücken': 'barbell bench press',
  'kniebeuge': 'barbell squat',
  'kniebeugen': 'barbell squat',
  'kreuzheben': 'barbell deadlift',
  'klimmzug': 'wide-grip pullup',
  'klimmzüge': 'wide-grip pullup',
  'schulterdrücken': 'barbell shoulder press',
  'rudern': 'bent over barbell row',
  'kabelrudern': 'seated cable row',
  'bizeps curl': 'barbell curl',
  'bizepscurl': 'barbell curl',
  'trizepsdrücken': 'triceps dip',
  'beinstrecken': 'leg extension',
  'beinbeugen': 'seated leg curl',
  'plank': 'plank',
  'dips': 'chest dip',
  'liegestützen': 'push-up',
  'liegestütze': 'push-up',
  'latzug': 'cable lat pulldown',
  'beinpresse': 'leg press',
  'wadenheben': 'calf raise',
  'hip thrust': 'barbell hip thrust',
  'ausfallschritt': 'barbell lunge',
  'ausfallschritte': 'barbell lunge',
  'schrägbankdrücken': 'incline barbell bench press',
  'crunch': 'crunch',
  'sit-up': 'sit-up',
  'situp': 'sit-up',
  'hammer curl': 'hammer curl',
  'hammercurl': 'hammer curl',
  'goblet squat': 'goblet squat',
  'arnold press': 'arnold press',
  'beinheben': 'hanging leg raise',
  'russian twist': 'russian twist',
  'butterfly': 'peck deck fly',
  'rückenstrecker': 'back extension',
  'hyperextension': 'back extension',
  'face pull': 'face pull',
  'trizeps pushdown': 'triceps pushdown',
  'rumänisches kreuzheben': 'romanian deadlift',
  'bulgarian split squat': 'bulgarian split squat',
}

// Findet eine Übung zu einem gespeicherten Namen (deutsch oder englisch)
export function findLocalExercise(name: string, list: LocalExercise[]): LocalExercise | null {
  const q = norm(name).trim()
  if (!q) return null
  const exact = list.find(e => norm(e.name) === q || norm(e.name_en) === q)
  if (exact) return exact
  const contains = list.find(e => {
    const de = norm(e.name)
    const en = norm(e.name_en)
    return de.includes(q) || q.includes(de) || (en !== '' && (en.includes(q) || q.includes(en)))
  })
  if (contains) return contains
  const enTerm = DE_TO_EN_EX[name.toLowerCase().trim()]
  if (enTerm) {
    return list.find(e => norm(e.name_en) === enTerm)
      ?? list.find(e => norm(e.name_en).includes(enTerm.split(' ')[0]))
      ?? null
  }
  return null
}
