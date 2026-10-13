// Sätze einer Übung: jeder Satz hat sein eigenes Gewicht und seine eigenen Wiederholungen.
// Ältere Einträge ohne saetze_log kennen nur „Sätze × Wdh. @ kg“ und werden daraus aufgefüllt.

export interface SetValue {
  wdh: number | null
  kg: number | null
}

export interface SetInput {
  wdh: string
  kg: string
}

interface ExerciseLike {
  saetze?: number | null
  wdh?: number | null
  gewicht_kg?: number | null
  saetze_log?: SetValue[] | null
}

export function setsOfExercise(exercise: ExerciseLike): SetValue[] {
  if (Array.isArray(exercise.saetze_log) && exercise.saetze_log.length > 0) return exercise.saetze_log
  const count = exercise.saetze ?? 0
  return Array.from({ length: count }, () => ({ wdh: exercise.wdh ?? null, kg: exercise.gewicht_kg ?? null }))
}

export function volumeOfSets(sets: SetValue[]): number {
  return sets.reduce((sum, set) => sum + (set.kg ?? 0) * (set.wdh ?? 0), 0)
}

export function maxKgOfSets(sets: SetValue[]): number | null {
  const weights = sets.map(set => set.kg ?? 0).filter(kg => kg > 0)
  return weights.length ? Math.max(...weights) : null
}

export function totalRepsOfSets(sets: SetValue[]): number {
  return sets.reduce((sum, set) => sum + (set.wdh ?? 0), 0)
}

export function toInputs(sets: SetValue[]): SetInput[] {
  return sets.map(set => ({ wdh: set.wdh ? String(set.wdh) : '', kg: set.kg ? String(set.kg) : '' }))
}

// Eingabefelder (Texte) → gespeicherte Sätze; komplett leere Sätze fallen weg
export function fromInputs(sets: SetInput[]): SetValue[] {
  return sets
    .map(set => ({ wdh: parseInt(set.wdh) || null, kg: parseFloat(set.kg.replace(',', '.')) || null }))
    .filter(set => set.wdh !== null || set.kg !== null)
}

export function formatKgValue(value: number): string {
  return `${Math.round(value * 10) / 10}`.replace('.', ',')
}
