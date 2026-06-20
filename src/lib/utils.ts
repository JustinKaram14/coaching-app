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

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}
