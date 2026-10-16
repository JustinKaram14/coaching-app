// Wochenziel „30 Pflanzen“: Gezählt werden verschiedene Pflanzenarten pro Woche (Montag bis Sonntag).
// Dieselbe Pflanze zählt nur einmal (Tomate, Kirschtomate, Dosentomate = Tomate). Kräuter, Gewürze, Nüsse, Samen,
// Hülsenfrüchte und Vollkorn zählen mit, jede Menge reicht. Öle, Zucker, Honig, Salz, Brühe und Wasser zählen nicht.
// Zuordnungen wie „Nudeln = Weizen“ sind Vereinfachungen. Keine ärztliche Empfehlung.

export const PFLANZEN_ZIEL = 30

export type PflanzenGruppe = 'Gemüse & Pilze' | 'Obst' | 'Getreide' | 'Hülsenfrüchte & Soja' | 'Nüsse & Samen' | 'Kräuter & Gewürze' | 'Eigene'
export const PFLANZEN_GRUPPEN: PflanzenGruppe[] = ['Gemüse & Pilze', 'Obst', 'Getreide', 'Hülsenfrüchte & Soja', 'Nüsse & Samen', 'Kräuter & Gewürze', 'Eigene']

export interface Pflanze {
  key: string
  name: string
  gruppe: PflanzenGruppe
  /** Zutaten-IDs, die diese Pflanze liefern */
  ids: string[]
}

const g = (gruppe: PflanzenGruppe, liste: [string, string, string[]][]): Pflanze[] =>
  liste.map(([key, name, ids]) => ({ key, name, gruppe, ids }))

export const PFLANZEN: Pflanze[] = [
  ...g('Gemüse & Pilze', [
    ['tomate', 'Tomate', ['tomate', 'kirschtomaten', 'tomaten_stueckig', 'tomatenmark']],
    ['gurke', 'Gurke', ['gurke']], ['paprika', 'Paprika', ['paprika']], ['zwiebel', 'Zwiebel', ['zwiebel', 'rote_zwiebel']],
    ['knoblauch', 'Knoblauch', ['knoblauch']], ['karotte', 'Karotte', ['karotte']], ['brokkoli', 'Brokkoli', ['brokkoli']],
    ['spinat', 'Spinat', ['spinat']], ['gruenkohl', 'Grünkohl', ['gruenkohl']], ['zucchini', 'Zucchini', ['zucchini']],
    ['aubergine', 'Aubergine', ['aubergine']], ['blumenkohl', 'Blumenkohl', ['blumenkohl']],
    ['weisskohl', 'Weißkohl', ['weisskohl', 'sauerkraut']], ['rotkohl', 'Rotkohl', ['rotkohl']], ['kimchi', 'Chinakohl (Kimchi)', ['kimchi']],
    ['suesskartoffel', 'Süßkartoffel', ['suesskartoffel']], ['kartoffel', 'Kartoffel', ['kartoffel']], ['kuerbis', 'Kürbis', ['kuerbis']],
    ['lauch', 'Lauch', ['lauch']], ['champignons', 'Champignons', ['champignons']], ['rucola', 'Rucola', ['rucola']],
    ['blattsalat', 'Blattsalat', ['blattsalat']], ['rote_bete', 'Rote Bete', ['rote_bete']], ['spargel', 'Spargel', ['spargel']],
    ['fenchel', 'Fenchel', ['fenchel']], ['mais', 'Mais', ['mais', 'polenta']], ['erbsen', 'Erbsen', ['erbsen']],
    ['gruene_bohnen', 'Grüne Bohnen', ['gruene_bohnen']],
  ]),
  ...g('Obst', [
    ['apfel', 'Apfel', ['apfel']], ['banane', 'Banane', ['banane']], ['heidelbeere', 'Heidelbeere', ['heidelbeeren']],
    ['himbeere', 'Himbeere', ['himbeeren']], ['erdbeere', 'Erdbeere', ['erdbeeren']], ['orange', 'Orange', ['orange']],
    ['mango', 'Mango', ['mango']], ['kiwi', 'Kiwi', ['kiwi']], ['birne', 'Birne', ['birne']], ['dattel', 'Dattel', ['datteln']],
    ['ananas', 'Ananas', ['ananas']], ['avocado', 'Avocado', ['avocado']], ['zitrone', 'Zitrone', ['zitronensaft']], ['olive', 'Olive', ['oliven']],
  ]),
  ...g('Getreide', [
    ['hafer', 'Hafer', ['haferflocken']], ['weizen', 'Weizen', ['vollkorn_nudeln', 'nudeln', 'couscous', 'bulgur', 'wrap', 'vollkornmehl']],
    ['roggen', 'Roggen', ['vollkornbrot']], ['reis', 'Reis', ['vollkornreis', 'basmatireis', 'reisnudeln']], ['quinoa', 'Quinoa', ['quinoa']],
    ['hirse', 'Hirse', ['hirse']], ['buchweizen', 'Buchweizen', ['buchweizen']],
  ]),
  ...g('Hülsenfrüchte & Soja', [
    ['kichererbse', 'Kichererbse', ['kichererbsen']], ['linse', 'Linse', ['linsen_rot', 'linsen_braun']],
    ['kidneybohne', 'Kidneybohne', ['kidneybohnen']], ['weisse_bohne', 'Weiße Bohne', ['weisse_bohnen']],
    ['soja', 'Soja', ['tofu', 'raeuchertofu', 'edamame', 'sojadrink', 'miso']],
  ]),
  ...g('Nüsse & Samen', [
    ['mandel', 'Mandel', ['mandeln', 'mandelmus']], ['walnuss', 'Walnuss', ['walnuesse']], ['cashew', 'Cashew', ['cashews']],
    ['haselnuss', 'Haselnuss', ['haselnuesse']], ['erdnuss', 'Erdnuss', ['erdnussmus']],
    ['sonnenblumenkerne', 'Sonnenblumenkerne', ['sonnenblumenkerne']], ['kuerbiskerne', 'Kürbiskerne', ['kuerbiskerne']],
    ['chia', 'Chiasamen', ['chiasamen']], ['lein', 'Leinsamen', ['leinsamen']], ['sesam', 'Sesam', ['sesam', 'tahini']], ['kokos', 'Kokos', ['kokosmilch']],
  ]),
  ...g('Kräuter & Gewürze', [
    ['petersilie', 'Petersilie', ['petersilie']], ['basilikum', 'Basilikum', ['basilikum']], ['schnittlauch', 'Schnittlauch', ['schnittlauch']],
    ['minze', 'Minze', ['minze']], ['ingwer', 'Ingwer', ['ingwer']], ['kurkuma', 'Kurkuma', ['kurkuma']], ['zimt', 'Zimt', ['zimt']], ['kakao', 'Kakao', ['kakao']],
  ]),
]

const NACH_ZUTAT = new Map<string, Pflanze>()
for (const p of PFLANZEN) for (const id of p.ids) NACH_ZUTAT.set(id, p)
const NACH_KEY = new Map(PFLANZEN.map(p => [p.key, p]))

export function pflanzeFuerKey(key: string): Pflanze | undefined { return NACH_KEY.get(key) }

/** Eigene Pflanze (frei eingetragen) */
export function eigenePflanze(name: string): Pflanze {
  const sauber = name.trim().replace(/\s+/g, ' ').slice(0, 40)
  return { key: `eigen:${sauber.toLowerCase()}`, name: sauber, gruppe: 'Eigene', ids: [] }
}

export function pflanzeAusKey(key: string, name?: string): Pflanze {
  return NACH_KEY.get(key) ?? { key, name: name ?? key.replace(/^eigen:/, ''), gruppe: 'Eigene', ids: [] }
}

/** Die verschiedenen Pflanzen eines Rezepts (jede Menge zählt) */
export function pflanzenVon(zutaten: { id: string }[]): Pflanze[] {
  const seen = new Map<string, Pflanze>()
  for (const z of zutaten) {
    const p = NACH_ZUTAT.get(z.id)
    if (p) seen.set(p.key, p)
  }
  return [...seen.values()]
}

// ─── Wochen ──────────────────────────────────────────────────────────────────

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Montag der Woche, in der das Datum liegt (lokale Zeit) */
export function wochenStart(datum: string | Date, verschiebung = 0): string {
  const d = typeof datum === 'string' ? new Date(`${datum}T12:00:00`) : new Date(datum)
  const tag = d.getDay()
  d.setDate(d.getDate() - (tag === 0 ? 6 : tag - 1) + verschiebung * 7)
  return iso(d)
}

export function wochenEnde(start: string): string {
  const d = new Date(`${start}T12:00:00`)
  d.setDate(d.getDate() + 6)
  return iso(d)
}

export function wochenLabel(start: string): string {
  const f = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  return `${f(start)} – ${f(wochenEnde(start))}`
}

export interface PflanzenZeile { datum: string; pflanze: string; name: string; quelle: 'rezept' | 'manuell' }

export interface WochenStand {
  /** verschiedene Pflanzen der Woche */
  pflanzen: { p: Pflanze; tage: string[]; quellen: Set<string> }[]
  anzahl: number
}

export function wochenStand(zeilen: PflanzenZeile[]): WochenStand {
  const map = new Map<string, { p: Pflanze; tage: Set<string>; quellen: Set<string> }>()
  for (const z of zeilen) {
    const e = map.get(z.pflanze) ?? { p: pflanzeAusKey(z.pflanze, z.name), tage: new Set<string>(), quellen: new Set<string>() }
    e.tage.add(z.datum); e.quellen.add(z.quelle)
    map.set(z.pflanze, e)
  }
  const pflanzen = [...map.values()].map(e => ({ p: e.p, tage: [...e.tage].sort(), quellen: e.quellen }))
    .sort((a, b) => a.p.name.localeCompare(b.p.name, 'de'))
  return { pflanzen, anzahl: pflanzen.length }
}
