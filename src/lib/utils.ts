import { format, parseISO, differenceInMinutes } from 'date-fns'
import { de } from 'date-fns/locale'

export function formatDate(date: string | Date, fmt = 'dd.MM.yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: de })
}

export function calcSleepHours(einschlaf: string, aufwach: string): number {
  const [eh, em] = einschlaf.split(':').map(Number)
  const [ah, am] = aufwach.split(':').map(Number)
  let mins = (ah * 60 + am) - (eh * 60 + em)
  if (mins < 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}

export function calcSleepHoursFromTimes(sleep: string, wake: string): number {
  const base = new Date('2000-01-01')
  const sleepDate = new Date(`2000-01-01T${sleep}`)
  const wakeDate = new Date(`2000-01-02T${wake}`)
  const diff = differenceInMinutes(wakeDate, sleepDate < base ? wakeDate : sleepDate)
  return Math.round((diff / 60) * 10) / 10
}

export function bmi(gewicht: number, groesse: number): number {
  return Math.round((gewicht / Math.pow(groesse / 100, 2)) * 10) / 10
}

export function bmiCategory(bmiVal: number): string {
  if (bmiVal < 18.5) return 'Untergewicht'
  if (bmiVal < 25) return 'Normalgewicht'
  if (bmiVal < 30) return 'Übergewicht'
  return 'Adipositas'
}

export function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

// Lokales Datum als YYYY-MM-DD (toISOString() würde nach UTC umrechnen und das Datum verschieben)
export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayISO() {
  return toLocalISO(new Date())
}

export interface TDEEResult {
  kalorien: number
  protein: number
  karbs: number
  fett: number
}

export function berechneTDEE(
  gewicht: number,
  groesse: number,
  alter: number,
  aktivitaet: string,
  ziel: string,
  ernaehrungsTyp: string,
): TDEEResult {
  // Mifflin-St Jeor (geschlechtsneutral: Mittelwert aus m/w)
  const bmr = 10 * gewicht + 6.25 * groesse - 5 * alter - 78

  const aktivMultiplier: Record<string, number> = {
    sitzend: 1.2,
    leicht_aktiv: 1.375,
    maessig_aktiv: 1.55,
    sehr_aktiv: 1.725,
    extrem_aktiv: 1.9,
  }
  const tdee = bmr * (aktivMultiplier[aktivitaet] ?? 1.55)

  let kalorien = Math.round(tdee)
  if (ziel === 'abnehmen') kalorien = Math.round(tdee - 400)
  else if (ziel === 'zunehmen') kalorien = Math.round(tdee + 350)

  // Makro-Splits nach Ernährungsweise (protein/kcal*4, karbs/kcal*4, fett/kcal*9)
  const splits: Record<string, { p: number; c: number; f: number }> = {
    standard:     { p: 0.25, c: 0.45, f: 0.30 },
    low_carb:     { p: 0.35, c: 0.20, f: 0.45 },
    high_protein: { p: 0.40, c: 0.35, f: 0.25 },
    vegan:        { p: 0.20, c: 0.55, f: 0.25 },
    vegetarisch:  { p: 0.20, c: 0.50, f: 0.30 },
    pescetarisch: { p: 0.25, c: 0.45, f: 0.30 },
  }
  const s = splits[ernaehrungsTyp] ?? splits.standard

  return {
    kalorien,
    protein: Math.round(kalorien * s.p / 4),
    karbs:   Math.round(kalorien * s.c / 4),
    fett:    Math.round(kalorien * s.f / 9),
  }
}
