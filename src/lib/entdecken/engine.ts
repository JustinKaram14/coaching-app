// Rechnet aus einer Rezept-Definition Nährwerte, Ernährungsarten und Gesundheits-Tags aus.
// Alle Schwellen stehen hier an einer Stelle und werden in der App unter „So wird gerechnet“ angezeigt.
// Alles sind Schätzungen aus Durchschnittswerten – keine ärztliche Empfehlung.

import type {
  Allergen, Ernaehrungsart, Gesundheit, Naehrwerte, Rezept, RezeptDef,
} from './types'
import { ZUTATEN } from './zutaten'
import { pflanzenVon } from './pflanzen'

export const SCHWELLEN = {
  /** Ballaststoffreich: mindestens ein Drittel des Tagesziels pro Portion */
  ballaststoffReichG: 10,
  ballaststoffTagesziel: 30,
  /** Low Carb: höchstens 25 % der Energie aus Kohlenhydraten */
  lowCarbAnteil: 0.25,
  /** Ketogen: höchstens 10 % der Energie aus (verwertbaren) Kohlenhydraten, mindestens 60 % aus Fett */
  ketoKhAnteil: 0.1,
  ketoFettAnteil: 0.6,
  /** Low Fat: höchstens 25 % der Energie aus Fett */
  lowFatAnteil: 0.25,
  /** Kalorienarm: höchstens 300 kcal pro Portion */
  kalorienarmKcal: 300,
  /** High Protein: mindestens 25 % der Energie aus Eiweiß und mindestens 15 g */
  highProteinAnteil: 0.25,
  highProteinMinG: 15,
  /** Antioxidantien-Punkte (Summe aus Stufe × Mengenanteil) für 1, 2, 3 Punkte */
  aox1: 1.5,
  aox2: 4,
  aox3: 7,
  /** Omega-3: mindestens 1 g pro Portion */
  omega3ReichMg: 1000,
  /** Präbiotisch: Summe (g × Gewicht der Zutat) pro Portion */
  praebiotischPunkte: 40,
  /** Leicht verdaulich: höchstens 20 g Fett und keine FODMAP-reiche Zutat über 10 g pro Portion */
  leichtFettG: 20,
  leichtFodmapG: 10,
  /** Pflanzenvielfalt: mindestens so viele verschiedene Pflanzen pro Rezept */
  pflanzenReich: 6,
  /** Schnell zubereitet / Wenig Zutaten */
  schnellMin: 20,
  wenigZutaten: 3,
  /** Hinweise zu Diagnosen */
  zuckerHochG: 15,
  salzHochG: 2,
  kaliumHochMg: 1000,
  gesaettigtHochG: 10,
  cholesterinHochMg: 200,
} as const

/** zählen bei „Wenig Zutaten“ nicht mit (zusätzlich zu Salz, Öl und Gewürzen) */
const NEBENZUTATEN = new Set([
  'knoblauch', 'ingwer', 'petersilie', 'basilikum', 'schnittlauch', 'minze', 'zitronensaft', 'tomatenmark', 'wasser',
])

const LEER: Naehrwerte = {
  kcal: 0, protein: 0, kh: 0, ballast: 0, zucker: 0, fett: 0, gesaettigt: 0, einfach: 0,
  mehrfach: 0, cholesterin: 0, natrium: 0, salz: 0, kalium: 0, omega3: 0,
}

export function leereNaehrwerte(): Naehrwerte {
  return { ...LEER }
}

export function skaliereNaehrwerte(n: Naehrwerte, faktor: number): Naehrwerte {
  const out = { ...LEER }
  for (const k of Object.keys(LEER) as (keyof Naehrwerte)[]) out[k] = n[k] * faktor
  return out
}

/** Anteil an der Energie (0–1) */
function anteil(kcalAusMakro: number, gesamt: number): number {
  return gesamt > 0 ? kcalAusMakro / gesamt : 0
}

export function berechneRezept(def: RezeptDef): Rezept {
  const portionen = Math.max(1, def.portionen)
  const summe = leereNaehrwerte()
  const allergene = new Set<Allergen>()
  let laktose = false
  let tier = 0 // 0 pflanze, 1 honig, 2 ei/milch, 3 fisch, 4 fleisch
  let gesamtG = 0
  let aoxPunkte = 0
  let prePunkte = 0
  let probiotisch = false
  let fermentiert = false
  let fodmapStark = false
  let zutatenAnzahl = 0
  const suchwoerter: string[] = [def.name.toLowerCase()]

  for (const rz of def.zutaten) {
    const z = ZUTATEN[rz.id]
    if (!z) continue
    const f = rz.g / 100
    summe.kcal += z.n.kcal * f
    summe.protein += z.n.protein * f
    summe.kh += z.n.kh * f
    summe.ballast += z.n.ballast * f
    summe.zucker += z.n.zucker * f
    summe.fett += z.n.fett * f
    summe.gesaettigt += z.n.gesaettigt * f
    summe.einfach += z.n.einfach * f
    summe.mehrfach += z.n.mehrfach * f
    summe.cholesterin += z.n.cholesterin * f
    summe.natrium += z.n.natrium * f
    summe.kalium += z.n.kalium * f
    summe.omega3 += z.n.omega3 * f

    for (const a of z.allergene) allergene.add(a)
    if (z.laktose) laktose = true
    tier = Math.max(tier, { pflanze: 0, honig: 1, eimilch: 2, fisch: 3, fleisch: 4 }[z.typ])
    gesamtG += rz.g * z.quellung

    const gPort = rz.g / portionen
    // Antioxidantien: Stufe × Anteil einer „sinnvollen Menge“ (40 g pro Portion)
    if (z.aox > 0) aoxPunkte += z.aox * Math.min(1, gPort / 40)
    if (z.pre > 0) prePunkte += gPort * z.pre
    if (z.pro > 0 && gPort >= z.pro) probiotisch = true
    if (z.ferm > 0 && gPort >= z.ferm) fermentiert = true
    if (z.fodmap && gPort >= SCHWELLEN.leichtFodmapG) fodmapStark = true
    if (!z.basis && !NEBENZUTATEN.has(z.id)) zutatenAnzahl++

    suchwoerter.push(z.name.toLowerCase(), ...(z.plural ? [z.plural.toLowerCase()] : []), ...z.alias)
  }

  const pro = skaliereNaehrwerte(summe, 1 / portionen)
  pro.salz = (pro.natrium * 2.5) / 1000
  const portionG = Math.round(gesamtG / portionen)

  // ── Ernährungsarten ──
  const kcalMakro = pro.protein * 4 + pro.kh * 4 + pro.fett * 9
  const khAnteil = anteil(pro.kh * 4, kcalMakro)
  const fettAnteil = anteil(pro.fett * 9, kcalMakro)
  const eiweissAnteil = anteil(pro.protein * 4, kcalMakro)
  const verwertbareKhAnteil = anteil(Math.max(0, pro.kh - pro.ballast) * 4, kcalMakro)

  const arten: Ernaehrungsart[] = []
  if (tier <= 2) arten.push('vegetarisch')
  if (tier === 0) arten.push('vegan')
  if (tier <= 3) arten.push('pescetarisch')
  if (khAnteil <= SCHWELLEN.lowCarbAnteil) arten.push('lowcarb')
  if (fettAnteil <= SCHWELLEN.lowFatAnteil) arten.push('lowfat')
  if (pro.kcal <= SCHWELLEN.kalorienarmKcal) arten.push('kalorienarm')
  if (eiweissAnteil >= SCHWELLEN.highProteinAnteil && pro.protein >= SCHWELLEN.highProteinMinG) arten.push('highprotein')
  if (verwertbareKhAnteil <= SCHWELLEN.ketoKhAnteil && fettAnteil >= SCHWELLEN.ketoFettAnteil) arten.push('keto')
  if (!allergene.has('gluten')) arten.push('glutenfrei')
  if (!laktose) arten.push('laktosefrei')

  // ── Gesundheit ──
  const antioxidantien: Gesundheit['antioxidantien'] =
    aoxPunkte >= SCHWELLEN.aox3 ? 3 : aoxPunkte >= SCHWELLEN.aox2 ? 2 : aoxPunkte >= SCHWELLEN.aox1 ? 1 : 0
  const praebiotisch = prePunkte >= SCHWELLEN.praebiotischPunkte
  const leichtVerdaulich = !fodmapStark && pro.fett <= SCHWELLEN.leichtFettG && pro.ballast < 12
  const omega3Reich = pro.omega3 >= SCHWELLEN.omega3ReichMg
  const gesundheit: Gesundheit = {
    ballaststoffreich: pro.ballast >= SCHWELLEN.ballaststoffReichG,
    antioxidantien,
    praebiotisch,
    probiotisch,
    fermentiert,
    leichtVerdaulich,
    darmfreundlich: praebiotisch || probiotisch || fermentiert,
    omega3Reich,
    entzuendungshemmend: omega3Reich || (pro.omega3 >= 400 && antioxidantien >= 2),
  }

  // ── Reihen ──
  const alleReihen = [...def.reihen]
  if (def.zeitMin <= SCHWELLEN.schnellMin) alleReihen.push('schnell')
  if (zutatenAnzahl <= SCHWELLEN.wenigZutaten) alleReihen.push('wenig-zutaten')

  return {
    ...def,
    pro,
    portionG,
    arten,
    allergene: [...allergene],
    laktose,
    gesundheit,
    alleReihen,
    zutatenAnzahl,
    suchtext: [...new Set(suchwoerter)].join(' '),
    pflanzen: pflanzenVon(def.zutaten).map(p => p.key),
  }
}

export type MengenModus = 'portion' | 'gramm'

/** Nährwerte für eine gewählte Menge (n Portionen oder g) */
export function naehrwerteFuerMenge(r: Rezept, modus: MengenModus, menge: number): { n: Naehrwerte; gramm: number } {
  if (modus === 'portion') {
    return { n: skaliereNaehrwerte(r.pro, menge), gramm: Math.round(r.portionG * menge) }
  }
  const faktor = r.portionG > 0 ? menge / r.portionG : 0
  return { n: skaliereNaehrwerte(r.pro, faktor), gramm: Math.round(menge) }
}
