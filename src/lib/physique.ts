// Körperentwicklung der Figur: wächst nur durch regelmäßiges Training UND Ernährungs-Tracking.
// Alles wird aus den echten Einträgen (Training, Sätze, Mahlzeiten) berechnet, nicht aus Logins oder XP.
// Eine volle Woche (alle geplanten Trainings + Ernährung an 5 Tagen) bringt 1 Wachstumspunkt,
// bei durchgehend perfekten Wochen sind alle 6 Stufen nach ca. 6 Monaten erreicht.

export const STAGE_THRESHOLDS = [0, 4, 8, 12, 17, 21, 26] // Wachstumspunkte, ab denen Stufe 0..6 erreicht ist
export const MAX_STAGE = STAGE_THRESHOLDS.length - 1
export const STAGE_NAMES = ['Einsteiger', 'Aktiv', 'Trainiert', 'Athletisch', 'Definiert', 'Stark', 'Durchtrainiert']

const MIN_FACTOR = 0.5 // unter der Hälfte beim Training oder beim Tracking wächst in dieser Woche nichts
const WEAK_WEEK = 0.25 // darunter gilt eine Woche als „Pause“
const WEAK_WEEKS_BEFORE_LOSS = 3 // erst nach so vielen schwachen Wochen in Folge geht es zurück
const LOSS_PER_WEEK = 0.3 // Rückgang pro weiterer schwacher Woche (sehr langsam)
const STRENGTH_BONUS = 1.2 // Woche mit Steigerung in einer Übung zählt etwas mehr
const NUTRITION_DAYS_FOR_FULL_WEEK = 5
const MIN_TRAINING_MINUTES = 20
const MAX_HISTORY_WEEKS = 52

export interface PhysiqueTraining { id: string; datum: string; dauer_min: number | null }
export interface PhysiqueSet { wdh: number | null; kg: number | null }
export interface PhysiqueExercise {
  training_id: string
  uebungsname: string
  saetze: number | null
  wdh: number | null
  gewicht_kg: number | null
  saetze_log: PhysiqueSet[] | null
}
export interface PhysiqueMeal { datum: string; mahlzeit: string }

export interface WeekResult {
  week: string // Montag der Woche (YYYY-MM-DD)
  trainingDays: number
  nutritionDays: number
  progressed: boolean
  factor: number // Wachstum dieser Woche (0 bis 1,2)
}

export interface PhysiqueResult {
  level: number // 0 bis 6, stufenlos (für die Darstellung)
  stage: number // 0 bis 6, ganze Stufe
  stageName: string
  nextStage: number | null
  progressToNext: number // 0 bis 1
  weeksToNext: number | null // grobe Schätzung bei gleichbleibendem Tempo
  growthPoints: number
  currentWeek: WeekResult
  trainingGoal: number // geplante Trainings pro Woche
  hasData: boolean
}

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function mondayOf(iso: string): string {
  const date = parseDay(iso)
  const dow = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dow)
  return isoOf(date)
}

function addWeeks(mondayIso: string, weeks: number): string {
  const date = parseDay(mondayIso)
  date.setUTCDate(date.getUTCDate() + weeks * 7)
  return isoOf(date)
}

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim()

// Epley-Schätzung des Einer-Wiederholungsmaximums; ohne Gewicht zählen die Wiederholungen
function strengthScore(set: PhysiqueSet): number {
  const reps = set.wdh ?? 0
  if (reps <= 0) return 0
  return set.kg && set.kg > 0 ? set.kg * (1 + reps / 30) : reps
}

function setsOf(exercise: PhysiqueExercise): PhysiqueSet[] {
  if (Array.isArray(exercise.saetze_log) && exercise.saetze_log.length > 0) return exercise.saetze_log
  return Array.from({ length: exercise.saetze ?? 0 }, () => ({ wdh: exercise.wdh, kg: exercise.gewicht_kg }))
}

export function levelFromPoints(points: number): number {
  if (points <= 0) return 0
  if (points >= STAGE_THRESHOLDS[MAX_STAGE]) return MAX_STAGE
  let stage = 0
  while (STAGE_THRESHOLDS[stage + 1] <= points) stage++
  const from = STAGE_THRESHOLDS[stage]
  const to = STAGE_THRESHOLDS[stage + 1]
  return stage + (points - from) / (to - from)
}

interface Options {
  today: string // YYYY-MM-DD
  trainings: PhysiqueTraining[]
  exercises: PhysiqueExercise[]
  meals: PhysiqueMeal[]
  trainingsPerWeek?: number | null
}

export function calcPhysique({ today, trainings, exercises, meals, trainingsPerWeek }: Options): PhysiqueResult {
  const goal = Math.min(6, Math.max(2, Math.round(trainingsPerWeek ?? 3)))

  // Trainings pro Woche: ein Tag zählt einmal, und nur mit Dauer oder echten Übungen
  const exercisesByTraining = new Map<string, PhysiqueExercise[]>()
  for (const ex of exercises) {
    const list = exercisesByTraining.get(ex.training_id) ?? []
    list.push(ex)
    exercisesByTraining.set(ex.training_id, list)
  }
  const trainingDays = new Map<string, Set<string>>()
  const dateOfTraining = new Map<string, string>()
  for (const t of trainings) {
    dateOfTraining.set(t.id, t.datum)
    const real = (t.dauer_min ?? 0) >= MIN_TRAINING_MINUTES || (exercisesByTraining.get(t.id)?.length ?? 0) > 0
    if (!real) continue
    const week = mondayOf(t.datum)
    const set = trainingDays.get(week) ?? new Set<string>()
    set.add(t.datum)
    trainingDays.set(week, set)
  }

  // Ernährungstage: mindestens zwei verschiedene Mahlzeiten eingetragen
  const mealsByDay = new Map<string, Set<string>>()
  for (const m of meals) {
    const set = mealsByDay.get(m.datum) ?? new Set<string>()
    set.add(m.mahlzeit)
    mealsByDay.set(m.datum, set)
  }
  const nutritionDays = new Map<string, number>()
  for (const [day, kinds] of mealsByDay) {
    if (kinds.size < 2) continue
    const week = mondayOf(day)
    nutritionDays.set(week, (nutritionDays.get(week) ?? 0) + 1)
  }

  // Steigerung: eine Übung übertrifft ihren bisherigen Bestwert um mindestens 1 %
  const bestSoFar = new Map<string, number>()
  const progressWeeks = new Set<string>()
  const sessions: { date: string; name: string; score: number }[] = []
  for (const ex of exercises) {
    const date = dateOfTraining.get(ex.training_id)
    if (!date) continue
    const score = Math.max(0, ...setsOf(ex).map(strengthScore))
    if (score > 0) sessions.push({ date, name: normalize(ex.uebungsname), score })
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date))
  const bestByDay = new Map<string, number>()
  for (const s of sessions) {
    const key = `${s.name}|${s.date}`
    bestByDay.set(key, Math.max(bestByDay.get(key) ?? 0, s.score))
  }
  for (const [key, score] of [...bestByDay.entries()].sort((a, b) => a[0].split('|')[1].localeCompare(b[0].split('|')[1]))) {
    const [name, date] = key.split('|')
    const before = bestSoFar.get(name)
    if (before !== undefined && score >= before * 1.01) progressWeeks.add(mondayOf(date))
    bestSoFar.set(name, Math.max(before ?? 0, score))
  }

  const weekResult = (week: string): WeekResult => {
    const tDays = trainingDays.get(week)?.size ?? 0
    const nDays = nutritionDays.get(week) ?? 0
    const T = Math.min(1, tDays / goal)
    const N = Math.min(1, nDays / NUTRITION_DAYS_FOR_FULL_WEEK)
    const progressed = progressWeeks.has(week)
    let factor = T >= MIN_FACTOR && N >= MIN_FACTOR ? T * N : 0
    if (factor > 0 && progressed) factor *= STRENGTH_BONUS
    return { week, trainingDays: tDays, nutritionDays: nDays, progressed, factor }
  }

  const thisWeek = mondayOf(today)
  const activeWeeks = [...trainingDays.keys(), ...nutritionDays.keys()].sort()
  const hasData = activeWeeks.length > 0
  const currentWeek = weekResult(thisWeek)
  if (!hasData) {
    return {
      level: 0, stage: 0, stageName: STAGE_NAMES[0], nextStage: 1, progressToNext: 0, weeksToNext: null,
      growthPoints: 0, currentWeek, trainingGoal: goal, hasData,
    }
  }

  // Abgeschlossene Wochen der Reihe nach durchrechnen: Wachstum, danach langsamer Rückgang bei langer Pause
  const firstWeek = activeWeeks[0] > addWeeks(thisWeek, -MAX_HISTORY_WEEKS) ? activeWeeks[0] : addWeeks(thisWeek, -MAX_HISTORY_WEEKS)
  let points = 0
  let weakInRow = 0
  let floor = 0
  const recent: number[] = []
  for (let week = firstWeek; week < thisWeek; week = addWeeks(week, 1)) {
    const result = weekResult(week)
    recent.push(result.factor)
    if (result.factor >= WEAK_WEEK) {
      weakInRow = 0
      points += result.factor
    } else {
      weakInRow++
      if (weakInRow >= WEAK_WEEKS_BEFORE_LOSS) points = Math.max(floor, points - LOSS_PER_WEEK)
    }
    // Die zuletzt erreichte Stufe geht nie verloren
    floor = Math.max(floor, STAGE_THRESHOLDS[Math.floor(levelFromPoints(points))])
  }

  const total = Math.min(STAGE_THRESHOLDS[MAX_STAGE], points + currentWeek.factor)
  const level = levelFromPoints(total)
  const stage = Math.min(MAX_STAGE, Math.floor(level))
  const nextStage = stage < MAX_STAGE ? stage + 1 : null
  const progressToNext = nextStage === null ? 1 : level - stage
  const lastWeeks = recent.slice(-4)
  const avg = lastWeeks.length ? lastWeeks.reduce((a, b) => a + b, 0) / lastWeeks.length : 0
  const weeksToNext = nextStage !== null && avg >= WEAK_WEEK
    ? Math.max(1, Math.ceil((STAGE_THRESHOLDS[nextStage] - total) / avg))
    : null

  return { level, stage, stageName: STAGE_NAMES[stage], nextStage, progressToNext, weeksToNext, growthPoints: total, currentWeek, trainingGoal: goal, hasData }
}
