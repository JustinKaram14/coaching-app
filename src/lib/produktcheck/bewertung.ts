// Produktbewertung 0–100: 60 % Nährwertqualität (Nutri-Score-Punkte), 30 % Zusatzstoffe, 10 % Bio.
// Ein Zusatzstoff mit hohem Risiko begrenzt die Gesamtnote auf 49.

import { STUFEN, zusatzstoff, type Stufe, type Zusatzstoff } from './zusatzstoffe'

export interface Produkt {
  barcode: string
  name: string
  marke?: string
  bild?: string
  menge?: string
  /** Nährwerte pro 100 g bzw. 100 ml */
  kcal?: number
  zucker?: number
  gesaettigt?: number
  salz?: number
  ballast?: number
  protein?: number
  obstGemuese?: number
  getraenk: boolean
  wasser?: boolean
  bio: boolean
  /** OFF-Tags, z. B. 'en:e330' */
  zusatzstoffe: string[]
  allergene: string[]
  spuren: string[]
  /** OFF ingredients_analysis_tags, z. B. 'en:palm-oil', 'en:non-vegan' */
  analyse: string[]
  kategorien: string[]
  zutaten?: string
}

/** 0 dunkelgrün, 1 grün, 2 orange, 3 rot */
export type Farbe = 0 | 1 | 2 | 3
export const FARBEN = ['#1e8c4e', '#41c36b', '#ef8a26', '#e0392f']
/** Risikostufen der Zusatzstoffe: kein, begrenzt, mäßig, hoch */
export const RISIKO_FARBEN = ['#41c36b', '#f2c230', '#ef8a26', '#e0392f']

export interface Merkmal {
  id: 'bio' | 'obst' | 'ballast' | 'protein' | 'kcal' | 'zucker' | 'gesaettigt' | 'salz' | 'zusatzstoffe'
  titel: string
  text: string
  farbe: Farbe
  wert?: number
  einheit?: string
  /** Farbskala: Grenzen (inkl. Start und Ende) und Farbe je Abschnitt */
  skala?: { grenzen: number[]; farben: Farbe[] }
}

export interface ZusatzstoffTreffer extends Zusatzstoff { bekannt: boolean }

export interface Bewertung {
  punkte: number | null
  stufe: { label: string; farbe: Farbe } | null
  positiv: Merkmal[]
  negativ: Merkmal[]
  zusatzstoffe: ZusatzstoffTreffer[]
  teile: { naehrwerte: number; zusatzstoffe: number; bio: number } | null
  nutriscorePunkte: number | null
}

// ─── Nutri-Score-Punkte (Algorithmus 2017, feste und flüssige Lebensmittel) ──

/** Ein Punkt je überschrittener Schwelle (schritt, 2·schritt, …), höchstens max */
function stufenPunkte(wert: number, schritt: number, max = 10): number {
  return Math.min(max, Math.max(0, Math.ceil(wert / schritt) - 1))
}

function punkteAus(wert: number, grenzen: number[], punkte: number[]): number {
  let p = 0
  grenzen.forEach((g, i) => { if (wert > g) p = punkte[i] })
  return p
}

export function nutriscore(p: Produkt): number | null {
  if (p.kcal == null) return null
  const kj = p.kcal * 4.184
  const natrium = (p.salz ?? 0) * 400
  const fg = p.obstGemuese ?? 0
  const negativ = p.getraenk
    ? stufenPunkte(kj, 30) + stufenPunkte(p.zucker ?? 0, 1.5) + stufenPunkte(p.gesaettigt ?? 0, 1) + stufenPunkte(natrium, 90)
    : stufenPunkte(kj, 335) + stufenPunkte(p.zucker ?? 0, 4.5) + stufenPunkte(p.gesaettigt ?? 0, 1) + stufenPunkte(natrium, 90)
  const obst = p.getraenk ? punkteAus(fg, [40, 60, 80], [2, 4, 10]) : punkteAus(fg, [40, 60, 80], [1, 2, 5])
  const ballast = punkteAus(p.ballast ?? 0, [0.9, 1.9, 2.8, 3.7, 4.7], [1, 2, 3, 4, 5])
  const protein = punkteAus(p.protein ?? 0, [1.6, 3.2, 4.8, 6.4, 8.0], [1, 2, 3, 4, 5])
  const obstMax = p.getraenk ? 10 : 5
  return negativ >= 11 && obst < obstMax ? negativ - ballast - obst : negativ - ballast - obst - protein
}

// ─── Anzeige-Skalen (Grenzen entsprechen 2/4/7/10 Nutri-Score-Punkten) ───────

const SKALEN_FEST = {
  kcal: [0, 160, 360, 560, 800],
  zucker: [0, 9, 18, 31, 45],
  gesaettigt: [0, 2, 4, 7, 10],
  salz: [0, 0.46, 0.92, 1.62, 2.3],
}
const SKALEN_GETRAENK = {
  kcal: [0, 14, 29, 50, 65],
  zucker: [0, 3, 6, 10.5, 15],
  gesaettigt: [0, 2, 4, 7, 10],
  salz: [0, 0.46, 0.92, 1.62, 2.3],
}

const TEXTE: Record<'kcal' | 'zucker' | 'gesaettigt' | 'salz', [string, string, string[]]> = {
  kcal: ['Kalorien', 'kcal', ['Wenige Kalorien', 'Moderat kalorienreich', 'Etwas zu kalorienreich', 'Zu kalorienreich']],
  zucker: ['Zucker', 'g', ['Wenig Zucker', 'Moderat Zucker', 'Etwas zu süß', 'Zu süß']],
  gesaettigt: ['Gesättigte Fettsäuren', 'g', ['Wenig gesättigte Fette', 'Moderat gesättigte Fette', 'Etwas zu fettig', 'Zu fettig']],
  salz: ['Salz', 'g', ['Wenig Salz', 'Moderat Salz', 'Etwas zu salzig', 'Zu salzig']],
}

function farbeIn(wert: number, grenzen: number[]): Farbe {
  if (wert <= grenzen[1]) return 0
  if (wert <= grenzen[2]) return 1
  if (wert <= grenzen[3]) return 2
  return 3
}

function runde(v: number): number {
  return v >= 10 ? Math.round(v) : Math.round(v * 10) / 10
}

export function stufeFuer(punkte: number): { label: string; farbe: Farbe } {
  if (punkte >= 75) return { label: 'Ausgezeichnet', farbe: 0 }
  if (punkte >= 50) return { label: 'Gut', farbe: 1 }
  if (punkte >= 25) return { label: 'Mäßig', farbe: 2 }
  return { label: 'Schlecht', farbe: 3 }
}

const ABZUG: Record<Stufe, number> = { 0: 0, 1: 6, 2: 15, 3: 30 }

export function bewerte(p: Produkt): Bewertung {
  const zusatz = [...new Set(p.zusatzstoffe)].map(zusatzstoff).sort((a, b) => b.stufe - a.stufe)
  const positiv: Merkmal[] = []
  const negativ: Merkmal[] = []

  if (p.bio) positiv.push({ id: 'bio', titel: 'Bio', text: 'Aus biologischer Landwirtschaft', farbe: 0 })

  // Positive Nährstoffe
  if ((p.obstGemuese ?? 0) > 40) {
    positiv.push({ id: 'obst', titel: 'Obst & Gemüse', text: p.obstGemuese! > 80 ? 'Hoher Anteil' : 'Gute Menge', farbe: p.obstGemuese! > 80 ? 0 : 1,
      wert: Math.round(p.obstGemuese!), einheit: '%', skala: { grenzen: [0, 80, 100], farben: [1, 0] } })
  }
  if ((p.ballast ?? 0) > 0.9) {
    positiv.push({ id: 'ballast', titel: 'Ballaststoffe', text: p.ballast! > 4.7 ? 'Viele Ballaststoffe' : 'Einige Ballaststoffe', farbe: p.ballast! > 4.7 ? 0 : 1,
      wert: runde(p.ballast!), einheit: 'g', skala: { grenzen: [0, 4.7, 9], farben: [1, 0] } })
  }
  if ((p.protein ?? 0) > 3.2) {
    positiv.push({ id: 'protein', titel: 'Protein', text: p.protein! > 8 ? 'Viel Protein' : 'Etwas Protein', farbe: p.protein! > 8 ? 0 : 1,
      wert: runde(p.protein!), einheit: 'g', skala: { grenzen: [0, 8, 16], farben: [1, 0] } })
  }

  // Kalorien, Zucker, gesättigte Fette, Salz: grün = positiv, orange/rot = negativ
  const skalen = p.getraenk ? SKALEN_GETRAENK : SKALEN_FEST
  for (const id of ['kcal', 'zucker', 'gesaettigt', 'salz'] as const) {
    const wert = p[id]
    if (wert == null) continue
    const grenzen = skalen[id]
    const farbe = p.wasser ? 0 : farbeIn(wert, grenzen)
    const [titel, einheit, texte] = TEXTE[id]
    const m: Merkmal = { id, titel, text: texte[farbe], farbe, wert: runde(wert), einheit, skala: { grenzen, farben: [0, 1, 2, 3] } }
    ;(farbe <= 1 ? positiv : negativ).push(m)
  }

  // Zusatzstoffe
  const hoechste = zusatz.reduce<Stufe>((s, z) => (z.stufe > s ? z.stufe : s), 0)
  const zusatzMerkmal: Merkmal = zusatz.length === 0
    ? { id: 'zusatzstoffe', titel: 'Zusatzstoffe', text: 'Keine Zusatzstoffe', farbe: 0, wert: 0 }
    : { id: 'zusatzstoffe', titel: 'Zusatzstoffe', text: `Zusatzstoffe ${STUFEN[hoechste].kurz}`, farbe: ([0, 1, 2, 3] as Farbe[])[hoechste], wert: zusatz.length }
  ;(hoechste <= 0 ? positiv : negativ).push(zusatzMerkmal)

  const ns = p.wasser ? -15 : nutriscore(p)
  if (ns == null) {
    return { punkte: null, stufe: null, positiv, negativ, zusatzstoffe: zusatz, teile: null, nutriscorePunkte: null }
  }
  const naehrwerte = Math.round(60 * Math.min(1, Math.max(0, (20 - ns) / 30)))
  const zusatzTeil = Math.max(0, 30 - zusatz.reduce((s, z) => s + ABZUG[z.stufe], 0))
  const bio = p.bio ? 10 : 0
  let punkte = naehrwerte + zusatzTeil + bio
  if (hoechste === 3) punkte = Math.min(punkte, 49)
  // Negative Merkmale nach Schwere sortieren
  negativ.sort((a, b) => b.farbe - a.farbe)
  return { punkte, stufe: stufeFuer(punkte), positiv, negativ, zusatzstoffe: zusatz, teile: { naehrwerte, zusatzstoffe: zusatzTeil, bio }, nutriscorePunkte: ns }
}
