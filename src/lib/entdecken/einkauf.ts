// Einkaufsliste für „Entdecken“: mehrere Rezepte werden zusammengerechnet und nach Supermarkt-Bereichen sortiert.

import type { Rezept } from './types'
import { ZUTATEN, zutatZeile } from './zutaten'

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
zuordnen('Hülsenfrüchte & Soja', ['kichererbsen', 'linsen_rot', 'linsen_braun', 'kidneybohnen', 'weisse_bohnen', 'tofu', 'raeuchertofu', 'edamame', 'sojadrink', 'miso'])
zuordnen('Nüsse, Samen & Trockenfrüchte', ['mandeln', 'walnuesse', 'cashews', 'haselnuesse', 'mandelmus', 'erdnussmus', 'sonnenblumenkerne', 'kuerbiskerne', 'chiasamen', 'leinsamen', 'sesam', 'tahini', 'datteln'])
zuordnen('Konserven & Vorrat', ['tomaten_stueckig', 'tomatenmark', 'oliven', 'kokosmilch', 'sojasauce', 'senf', 'balsamico', 'gemuesebruehe', 'honig', 'ahornsirup', 'kakao'])

/** Wasser steht nicht auf der Einkaufsliste */
const IGNORIERT = new Set(['wasser'])

export function bereichFuer(id: string): string {
  const z = ZUTATEN[id]
  if (!z) return 'Obst & Gemüse'
  if (z.typ === 'eimilch') return 'Milch & Eier'
  if (z.typ === 'fleisch' || z.typ === 'fisch') return 'Fleisch & Fisch'
  if (NACH_ID[id]) return NACH_ID[id]
  if (z.basis) return 'Öle & Gewürze'
  return 'Obst & Gemüse'
}

/** Rechnet alle Einträge der Liste zu einer Zutatenliste zusammen */
export function baueEinkaufsListe(eintraege: EinkaufsEintrag[], rezepte: ReadonlyMap<string, Rezept>): EinkaufsListe {
  const summe = new Map<string, { g: number; aus: Set<string> }>()
  const verwaist: EinkaufsEintrag[] = []
  for (const e of eintraege) {
    const r = rezepte.get(e.rezeptId)
    if (!r) { verwaist.push(e); continue }
    const faktor = e.portionen / r.portionen
    for (const z of r.zutaten) {
      if (!ZUTATEN[z.id] || IGNORIERT.has(z.id)) continue
      const alt = summe.get(z.id) ?? { g: 0, aus: new Set<string>() }
      alt.g += z.g * faktor
      alt.aus.add(r.name)
      summe.set(z.id, alt)
    }
  }
  const nachBereich = new Map<string, EinkaufsZeile[]>()
  for (const [id, { g, aus }] of summe) {
    const bereich = bereichFuer(id)
    const liste = nachBereich.get(bereich) ?? []
    liste.push({ id, text: zutatZeile(ZUTATEN[id], g), gramm: g, aus: [...aus] })
    nachBereich.set(bereich, liste)
  }
  const bereiche = BEREICHE.filter(b => nachBereich.has(b)).map(name => ({
    name,
    zeilen: nachBereich.get(name)!.sort((a, b) => ZUTATEN[a.id].name.localeCompare(ZUTATEN[b.id].name, 'de')),
  }))
  return { bereiche, verwaist, anzahl: bereiche.reduce((s, b) => s + b.zeilen.length, 0) }
}
