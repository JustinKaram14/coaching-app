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
export const muscleGroupLabel = (groupKey) => MUSCLE_GROUPS.find((groupEntry) => groupEntry.key === groupKey)?.label ?? 'Sonstige'
export const EXERCISE_BASE = './exercises/'
export const exerciseImageUrl = (exercise) => EXERCISE_BASE + exercise.image
export const exerciseGifUrl = (exercise) => EXERCISE_BASE + exercise.gif
export let exerciseCache = null
export function loadExerciseData() {
  return (
    (exerciseCache ||= fetch('./exercises/data/exercises_de.json')
      .then((response) => {
        if (!response.ok) throw Error('Übungsdaten nicht gefunden')
        return response.json()
      })
      .catch((error) => {
        throw ((exerciseCache = null), error)
      })),
    exerciseCache
  )
}
export function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
export function searchHaystack(exercise) {
  return normalizeText(`${exercise.name} ${exercise.name_en} ${exercise.equipment_de} ${exercise.target_de} ${exercise.body_part_de}`)
}
export function findExerciseByName(exerciseName, exercises) {
  let wanted = normalizeText(exerciseName)
  if (wanted) return exercises.find((exercise) => normalizeText(exercise.name) === wanted) ?? exercises.find((exercise) => normalizeText(exercise.name_en) === wanted)
}
export const EQUIPMENT_ORDER = {
  Langhantel: 0,
  Kurzhantel: 1,
  Maschine: 2,
  Kabel: 3,
  Körpergewicht: 4,
}
export const equipmentRank = (exercise) => EQUIPMENT_ORDER[exercise.equipment_group] ?? 5
export function findExercise(query, exercises) {
  let exact = findExerciseByName(query, exercises)
  if (exact) return exact
  let words = normalizeText(query).split(' ').filter(Boolean)
  if (!words.length) return
  let matches = exercises.filter((exercise) => {
    let haystack = normalizeText(`${exercise.name} ${exercise.name_en}`)
    return words.every((word) => haystack.includes(word) || (word.length > 4 && haystack.includes(word.slice(0, -1))))
  })
  return (
    matches.sort((first, second) => second.compound - first.compound || equipmentRank(first) - equipmentRank(second) || first.name.length - second.name.length),
    matches[0]
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
export function guessMuscleGroup(exerciseName, exercises) {
  if (exercises) {
    let found = findExerciseByName(exerciseName, exercises)
    if (found) return found.group
  }
  let normalized = normalizeText(exerciseName)
  for (let [pattern, groupResult] of GROUP_PATTERNS) if (pattern.test(normalized)) return groupResult
  return 'sonstige'
}
