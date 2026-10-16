// Typen für „Entdecken“: Rezepte aus der Startbibliothek und KI-Rezepte teilen dieselbe Struktur.
// Nährwerte, Allergene und Gesundheits-Tags werden NICHT von Hand gepflegt, sondern aus den Zutaten berechnet.

export type Mahlzeit = 'Frühstück' | 'Mittagessen' | 'Abendessen' | 'Snack'
export const MAHLZEITEN: Mahlzeit[] = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']

export type Allergen =
  | 'gluten' | 'milch' | 'ei' | 'fisch' | 'krebstiere' | 'erdnuss'
  | 'nuss' | 'soja' | 'sesam' | 'sellerie' | 'senf'

export type Herkunft = 'pflanze' | 'honig' | 'eimilch' | 'fisch' | 'fleisch'

/** Nährwerte pro 100 g (Natrium, Cholesterin, Kalium, Omega-3 in mg) */
export interface Naehrwerte100 {
  kcal: number
  protein: number
  kh: number
  ballast: number
  zucker: number
  fett: number
  gesaettigt: number
  einfach: number
  mehrfach: number
  cholesterin: number
  natrium: number
  kalium: number
  omega3: number
}

export interface Zutat {
  id: string
  name: string
  plural?: string
  typ: Herkunft
  n: Naehrwerte100
  allergene: Allergen[]
  /** enthält relevante Mengen Laktose (Hartkäse und Butter nicht) */
  laktose: boolean
  /** Antioxidantien-Stufe 0–3 (grobe Schätzung) */
  aox: number
  /** Gewicht als Präbiotikum (Zwiebel, Knoblauch, Hafer …), 0 = nein */
  pre: number
  /** Mindestmenge in g pro Portion, ab der die Zutat als Probiotikum zählt, 0 = nein */
  pro: number
  /** Mindestmenge in g pro Portion, ab der die Zutat als fermentiertes Lebensmittel zählt, 0 = nein */
  ferm: number
  /** viele FODMAPs / blähend */
  fodmap: boolean
  /** Verhältnis Gewicht gekocht zu roh (Reis ×2,5 …) */
  quellung: number
  /** Stück- oder Löffelmaß */
  einheit?: { n: string; p?: string; g: number; stueck: boolean }
  /** zusätzliche Suchbegriffe (kleingeschrieben), z. B. „pilz“ */
  alias: string[]
  /** gilt nicht als „richtige“ Zutat (Salz, Öl, Wasser, Gewürze) */
  basis: boolean
  /** zählt als pflanzliches Lebensmittel (für das spätere Wochenziel „30 Pflanzen“) */
  pflanze: boolean
}

export interface RezeptZutat {
  id: string
  g: number
}

/** Rezept-Definition (Startbibliothek oder KI) */
export interface RezeptDef {
  id: string
  name: string
  beschreibung?: string
  mahlzeiten: Mahlzeit[]
  /** Rezept-Reihen: salat, suppe, bowl, pfanne, ofen, suess, meal-prep */
  reihen: string[]
  zeitMin: number
  /** 1 leicht, 2 mittel, 3 anspruchsvoll */
  schwierigkeit: 1 | 2 | 3
  portionen: number
  zutaten: RezeptZutat[]
  schritte: string[]
  /** wo das Rezept herkommt */
  quelle: 'start' | 'ki'
  bildUrl?: string | null
}

export type Ernaehrungsart =
  | 'vegetarisch' | 'vegan' | 'pescetarisch' | 'lowcarb' | 'lowfat'
  | 'kalorienarm' | 'highprotein' | 'keto' | 'glutenfrei' | 'laktosefrei'

export interface Naehrwerte {
  kcal: number
  protein: number
  kh: number
  ballast: number
  zucker: number
  fett: number
  gesaettigt: number
  einfach: number
  mehrfach: number
  cholesterin: number
  natrium: number
  salz: number
  kalium: number
  omega3: number
}

export interface Gesundheit {
  ballaststoffreich: boolean
  /** 0 = kein Hinweis, 1–3 Punkte (Schätzung) */
  antioxidantien: 0 | 1 | 2 | 3
  praebiotisch: boolean
  probiotisch: boolean
  fermentiert: boolean
  leichtVerdaulich: boolean
  darmfreundlich: boolean
  omega3Reich: boolean
  entzuendungshemmend: boolean
}

/** Berechnete Sicht auf ein Rezept – das, womit die Oberfläche arbeitet */
export interface Rezept extends RezeptDef {
  /** Nährwerte pro Portion */
  pro: Naehrwerte
  /** geschätztes Gewicht einer Portion (fertig gegart) in g */
  portionG: number
  arten: Ernaehrungsart[]
  allergene: Allergen[]
  laktose: boolean
  gesundheit: Gesundheit
  /** alle Reihen inkl. berechneter (schnell, wenig-zutaten) */
  alleReihen: string[]
  /** Anzahl der „richtigen“ Zutaten ohne Salz, Öl, Gewürze */
  zutatenAnzahl: number
  /** kleingeschriebene Suchwörter: Name, Zutaten, Aliase */
  suchtext: string
  /** Schlüssel der verschiedenen Pflanzen im Rezept (für das Wochenziel „30 Pflanzen“) */
  pflanzen: string[]
}

export type DiagnoseCode = 'diabetes' | 'bluthochdruck' | 'reizdarm' | 'cholesterin' | 'niere'

export interface DiagnoseWarnung {
  code: DiagnoseCode
  text: string
}

export type AusschlussArt = 'hart' | 'weich'

export interface Ausschluss {
  id: string
  begriff: string
  art: AusschlussArt
}
