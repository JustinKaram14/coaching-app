// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.

export const MUSCLE_GROUPS = [
  {
    key: 'brust',
    label: 'Brust',
  },
  {
    key: 'ruecken',
    label: 'Rücken',
  },
  {
    key: 'schultern',
    label: 'Schultern',
  },
  {
    key: 'bizeps',
    label: 'Bizeps',
  },
  {
    key: 'trizeps',
    label: 'Trizeps',
  },
  {
    key: 'unterarme',
    label: 'Unterarme',
  },
  {
    key: 'quadrizeps',
    label: 'Quadrizeps',
  },
  {
    key: 'beinbeuger',
    label: 'Beinbeuger',
  },
  {
    key: 'gesaess',
    label: 'Gesäß',
  },
  {
    key: 'waden',
    label: 'Waden',
  },
  {
    key: 'bauch',
    label: 'Bauch',
  },
  {
    key: 'unterer_ruecken',
    label: 'Unterer Rücken',
  },
  {
    key: 'trapez',
    label: 'Trapez',
  },
  {
    key: 'huefte',
    label: 'Hüfte',
  },
  {
    key: 'cardio',
    label: 'Cardio',
  },
  {
    key: 'sonstige',
    label: 'Sonstige',
  },
]
export const muscleGroupLabel = (e) => MUSCLE_GROUPS.find((t) => t.key === e)?.label ?? 'Sonstige'
export const EXERCISE_BASE = './exercises/'
export const exerciseImageUrl = (e) => EXERCISE_BASE + e.image
export const exerciseGifUrl = (e) => EXERCISE_BASE + e.gif
export let exerciseCache = null
export function loadExerciseData() {
  return (
    (exerciseCache ||= fetch('./exercises/data/exercises_de.json')
      .then((e) => {
        if (!e.ok) throw Error('Übungsdaten nicht gefunden')
        return e.json()
      })
      .catch((e) => {
        throw ((exerciseCache = null), e)
      })),
    exerciseCache
  )
}
export function normalizeText(e) {
  return e
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
export function searchHaystack(e) {
  return normalizeText(`${e.name} ${e.name_en} ${e.equipment_de} ${e.target_de} ${e.body_part_de}`)
}
export function findExerciseByName(e, t) {
  let n = normalizeText(e)
  if (n) return t.find((e) => normalizeText(e.name) === n) ?? t.find((e) => normalizeText(e.name_en) === n)
}
export const EQUIPMENT_ORDER = {
  Langhantel: 0,
  Kurzhantel: 1,
  Maschine: 2,
  Kabel: 3,
  Körpergewicht: 4,
}
export const equipmentRank = (e) => EQUIPMENT_ORDER[e.equipment_group] ?? 5
export function findExercise(e, t) {
  let n = findExerciseByName(e, t)
  if (n) return n
  let r = normalizeText(e).split(' ').filter(Boolean)
  if (!r.length) return
  let i = t.filter((e) => {
    let t = normalizeText(`${e.name} ${e.name_en}`)
    return r.every((e) => t.includes(e) || (e.length > 4 && t.includes(e.slice(0, -1))))
  })
  return (
    i.sort((e, t) => t.compound - e.compound || equipmentRank(e) - equipmentRank(t) || e.name.length - t.name.length),
    i[0]
  )
}
export const GROUP_PATTERNS = [
  [/kniebeuge|squat|beinpresse|leg press|ausfallschritt|lunge|beinstrecker|leg extension|step.?up/, 'quadrizeps'],
  [/beinbeuger|leg curl|rumanian|rumaenisch|romanian|stiff.?leg/, 'beinbeuger'],
  [/hip thrust|glute|gesaess|po |kickback.*bein/, 'gesaess'],
  [/wade|calf/, 'waden'],
  [/bank|brust|fliegende|butterfly|chest|bench|liegestuetz|push.?up|dip/, 'brust'],
  [/kreuzheben|deadlift|rueckenstrecker|hyperextension|good morning/, 'unterer_ruecken'],
  [/klimmzug|pull.?up|chin.?up|latzug|lat |pulldown|rudern|row|pullover|rueck/, 'ruecken'],
  [
    /schulter|seitheben|frontheben|shoulder|lateral raise|overhead|military|face pull|arnold|schulterdruecken/,
    'schultern',
  ],
  [/trapez|shrug|schulterzucken/, 'trapez'],
  [/bizeps|curl|hammer/, 'bizeps'],
  [/trizeps|triceps|skull|pushdown|kickback|french/, 'trizeps'],
  [/unterarm|handgelenk|wrist|forearm/, 'unterarme'],
  [/bauch|crunch|sit.?up|plank|abs|beinheben|russian|twist/, 'bauch'],
  [/laufen|rad|cardio|rudergeraet|crosstrainer|seilspringen|hiit|burpee/, 'cardio'],
]
export function guessMuscleGroup(e, t) {
  if (t) {
    let n = findExerciseByName(e, t)
    if (n) return n.group
  }
  let n = normalizeText(e)
  for (let [e, t] of GROUP_PATTERNS) if (e.test(n)) return t
  return 'sonstige'
}
