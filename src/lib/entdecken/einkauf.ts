// Typen und Supermarkt-Bereiche der Einkaufsliste (zusammengerechnet wird in lib/einkauf/liste.ts).

import { ZUTATEN } from './zutaten'

export interface EinkaufsEintrag {
  id: string
  rezeptId: string
  rezeptName: string
  portionen: number
}

export interface EinkaufsZeile {
  /** ID der Zutat, zugleich Schlüssel fürs Abhaken */
  id: string
  text: string
  gramm: number
  /** Rezepte, aus denen die Zutat stammt */
  aus: string[]
}

export interface EinkaufsBereich { name: string; zeilen: EinkaufsZeile[] }

export interface EinkaufsListe {
  bereiche: EinkaufsBereich[]
  /** Einträge, deren Rezept nicht mehr existiert (z. B. gelöschtes KI-Rezept) */
  verwaist: EinkaufsEintrag[]
  anzahl: number
}

const BEREICHE = [
  'Obst & Gemüse', 'Brot, Getreide & Nudeln', 'Hülsenfrüchte & Soja', 'Milch & Eier', 'Fleisch & Fisch',
  'Nüsse, Samen & Trockenfrüchte', 'Konserven & Vorrat', 'Öle & Gewürze',
] as const

const NACH_ID: Record<string, (typeof BEREICHE)[number]> = {}
const zuordnen = (bereich: (typeof BEREICHE)[number], ids: string[]) => ids.forEach(i => { NACH_ID[i] = bereich })
zuordnen('Brot, Getreide & Nudeln', ['haferflocken', 'vollkornbrot', 'vollkorn_nudeln', 'nudeln', 'vollkornreis', 'basmatireis', 'quinoa', 'couscous', 'bulgur', 'hirse', 'buchweizen', 'reisnudeln', 'wrap', 'polenta', 'vollkornmehl'])
zuordnen('Hülsenfrüchte & Soja', ['kichererbsen', 'linsen_rot', 'linsen_braun', 'kidneybohnen', 'weisse_bohnen', 'tofu', 'raeuchertofu', 'edamame', 'sojadrink', 'miso', 'tempeh'])
zuordnen('Nüsse, Samen & Trockenfrüchte', ['mandeln', 'walnuesse', 'cashews', 'haselnuesse', 'mandelmus', 'erdnussmus', 'sonnenblumenkerne', 'kuerbiskerne', 'chiasamen', 'leinsamen', 'sesam', 'tahini', 'datteln'])
zuordnen('Konserven & Vorrat', ['tomaten_stueckig', 'tomatenmark', 'oliven', 'kokosmilch', 'sojasauce', 'senf', 'balsamico', 'gemuesebruehe', 'honig', 'ahornsirup', 'kakao'])

export function bereichFuer(id: string): string {
  const z = ZUTATEN[id]
  if (!z) return 'Obst & Gemüse'
  if (z.typ === 'eimilch') return 'Milch & Eier'
  if (z.typ === 'fleisch' || z.typ === 'fisch') return 'Fleisch & Fisch'
  if (NACH_ID[id]) return NACH_ID[id]
  if (z.basis) return 'Öle & Gewürze'
  return 'Obst & Gemüse'
}
