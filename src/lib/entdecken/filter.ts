// Suche, Filter, persönliche Einschränkungen (Anamnese + Ausschlussliste) und Tagesvorschläge.
// Reine Funktionen ohne Datenbankzugriff, damit sie sich leicht prüfen lassen.

import type {
  Allergen, Ausschluss, DiagnoseCode, DiagnoseWarnung, Ernaehrungsart, Mahlzeit, Rezept,
} from './types'
import { KCAL_SPANNEN, type DarmArt, type GesundheitsFilter } from './katalog'
import { SCHWELLEN } from './engine'

// ─── Text ────────────────────────────────────────────────────────────────────

export function normalisiere(s: string): string {
  // ä/ö/ü → a/o/u (auch „ae/oe/ue“), damit „Käse“ und „kaese“ dasselbe finden
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u').trim()
}

/** Einfache Wortstamm-Kürzung für die deutsche Mehrzahl: Pilze → pilz, Zwiebeln → zwiebel */
function stamm(w: string): string {
  return w.length > 5 ? w.replace(/(en|n|e|s)$/, '') : w
}

function woerter(s: string): string[] {
  return normalisiere(s).split(/[^a-z0-9]+/).filter(Boolean)
}

// ─── Regeln für Allergien und Unverträglichkeiten ────────────────────────────

interface Regel {
  id: string
  label: string
  /** Wortanfänge (normalisiert), die die Regel auslösen */
  stichworte: string[]
  /** Wörter, die genau passen müssen (kurze Wörter wie „ei“) */
  genau?: string[]
  trifft: (r: Rezept) => boolean
}

const hat = (a: Allergen) => (r: Rezept) => r.allergene.includes(a)

const REGELN: Regel[] = [
  { id: 'laktose', label: 'Laktose', stichworte: ['laktose', 'milchzucker'], trifft: r => r.laktose },
  { id: 'milch', label: 'Milch', stichworte: ['milch', 'kuhmilch', 'kasein', 'casein', 'molke'], trifft: hat('milch') },
  { id: 'gluten', label: 'Gluten', stichworte: ['gluten', 'zoeliakie', 'zeliakie', 'weizen', 'dinkel', 'roggen'], trifft: hat('gluten') },
  { id: 'erdnuss', label: 'Erdnüsse', stichworte: ['erdnuss', 'erdnusse', 'erdnuesse'], trifft: hat('erdnuss') },
  { id: 'nuss', label: 'Nüsse', stichworte: ['nuss', 'nusse', 'nuesse', 'haselnuss', 'walnuss', 'mandel', 'cashew', 'schalenfruchte', 'baumnuss'], trifft: hat('nuss') },
  { id: 'ei', label: 'Ei', stichworte: ['huhnerei', 'hühnerei', 'eiallergie', 'eiweissallergie'], genau: ['ei', 'eier'], trifft: hat('ei') },
  { id: 'soja', label: 'Soja', stichworte: ['soja'], trifft: hat('soja') },
  { id: 'fisch', label: 'Fisch', stichworte: ['fisch'], trifft: hat('fisch') },
  { id: 'krebstiere', label: 'Meeresfrüchte', stichworte: ['krebstier', 'schalentier', 'meeresfruchte', 'meeresfruechte', 'garnele', 'shrimp', 'krabbe'], trifft: hat('krebstiere') },
  { id: 'sesam', label: 'Sesam', stichworte: ['sesam'], trifft: hat('sesam') },
  { id: 'sellerie', label: 'Sellerie', stichworte: ['sellerie'], trifft: hat('sellerie') },
  { id: 'senf', label: 'Senf', stichworte: ['senf'], trifft: hat('senf') },
]

function regelFuerWort(w: string): Regel | undefined {
  return REGELN.find(r => r.genau?.includes(w) || r.stichworte.some(s => normalisiere(s) === w || (s.length >= 4 && w.startsWith(normalisiere(s)))))
}

/** Trifft ein Rezept auf diesen Begriff der Ausschlussliste? */
export function ausschlussTrifft(r: Rezept, begriff: string): boolean {
  const ws = woerter(begriff)
  if (ws.length === 0) return false
  // bekannte Allergene/Unverträglichkeiten über die Allergen-Daten prüfen, alles andere über den Suchtext
  if (ws.length === 1) {
    const regel = regelFuerWort(ws[0])
    if (regel) return regel.trifft(r)
  }
  const such = normalisiere(r.suchtext)
  const wortListe = such.split(/[^a-z0-9]+/)
  return ws.every(w => (w.length <= 3 ? wortListe.includes(w) : such.includes(w) || such.includes(stamm(w))))
}

// ─── Anamnese ────────────────────────────────────────────────────────────────

const DIAGNOSE_STICHWORTE: { code: DiagnoseCode; label: string; stichworte: string[] }[] = [
  { code: 'diabetes', label: 'Diabetes', stichworte: ['diabetes', 'insulin', 'praediabetes', 'blutzucker'] },
  { code: 'bluthochdruck', label: 'Bluthochdruck', stichworte: ['bluthochdruck', 'hypertonie', 'hypertonus'] },
  { code: 'reizdarm', label: 'Reizdarm / Darmerkrankung', stichworte: ['reizdarm', 'ibs', 'morbus', 'crohn', 'colitis', 'fodmap', 'blahung'] },
  { code: 'cholesterin', label: 'Cholesterin / Blutfette', stichworte: ['cholesterin', 'fettstoffwechsel', 'hyperlipid', 'blutfett'] },
  { code: 'niere', label: 'Nierenerkrankung', stichworte: ['niere', 'nieren', 'dialyse'] },
]

const KEIN_BEFUND = new Set(['keine', 'kein', 'keiner', 'nein', 'nichts', 'ohne', 'nicht', 'bekannt', 'bisher', 'derzeit', 'aktuell'])
const FUELLWOERTER = new Set([
  'und', 'oder', 'sowie', 'aber', 'mit', 'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'bei', 'von', 'zu', 'ist', 'sind',
  'allergie', 'allergien', 'unvertraglichkeit', 'unvertraglichkeiten', 'intoleranz', 'intoleranzen', 'erkrankung', 'erkrankungen',
  'diagnose', 'diagnosen', 'leicht', 'leichte', 'leichten', 'etwas', 'sehr', 'auch', 'gegen',
])

export interface AnamneseProfil {
  /** erkannte Allergien/Unverträglichkeiten (werden hart ausgeblendet) */
  harte: { label: string; regelId: string }[]
  /** erkannte Diagnosen (nur Hinweise und Sortierung) */
  diagnosen: { code: DiagnoseCode; label: string }[]
  /** Wörter, die nicht zugeordnet werden konnten */
  unbekannt: string[]
  /** Die Anamnese wurde nicht ausgefüllt */
  leer: boolean
}

/** Liest Allergien/Unverträglichkeiten und Erkrankungen/Diagnosen aus den Freitexten der Anamnese */
export function leseAnamnese(allergien: string | undefined, erkrankungen: string | undefined): AnamneseProfil {
  const harte = new Map<string, { label: string; regelId: string }>()
  const diagnosen = new Map<DiagnoseCode, { code: DiagnoseCode; label: string }>()
  const unbekannt = new Set<string>()
  let leer = true

  const texte = [allergien ?? '', erkrankungen ?? '']
  for (const text of texte) {
    for (const w of woerter(text)) {
      if (KEIN_BEFUND.has(w) || FUELLWOERTER.has(w) || (w.length < 3 && w !== 'ei')) continue
      leer = false
      const regel = regelFuerWort(w)
      if (regel) { harte.set(regel.id, { label: regel.label, regelId: regel.id }); continue }
      const d = DIAGNOSE_STICHWORTE.find(x => x.stichworte.some(s => w.startsWith(s)))
      if (d) { diagnosen.set(d.code, { code: d.code, label: d.label }); continue }
      if (w.length >= 4) unbekannt.add(w)
    }
  }
  return { harte: [...harte.values()], diagnosen: [...diagnosen.values()], unbekannt: [...unbekannt], leer }
}

export function diagnoseWarnungen(r: Rezept, codes: DiagnoseCode[]): DiagnoseWarnung[] {
  const out: DiagnoseWarnung[] = []
  const runde = (n: number) => Math.round(n)
  for (const code of codes) {
    if (code === 'diabetes' && r.pro.zucker >= SCHWELLEN.zuckerHochG)
      out.push({ code, text: `Viel Zucker (${runde(r.pro.zucker)} g pro Portion)` })
    if (code === 'bluthochdruck' && r.pro.salz >= SCHWELLEN.salzHochG)
      out.push({ code, text: `Viel Salz (${r.pro.salz.toFixed(1).replace('.', ',')} g pro Portion)` })
    if (code === 'reizdarm' && !r.gesundheit.leichtVerdaulich)
      out.push({ code, text: 'Nicht als leicht verdaulich eingestuft' })
    if (code === 'cholesterin' && (r.pro.gesaettigt >= SCHWELLEN.gesaettigtHochG || r.pro.cholesterin >= SCHWELLEN.cholesterinHochMg))
      out.push({ code, text: 'Viel gesättigtes Fett oder Cholesterin' })
    if (code === 'niere' && r.pro.kalium >= SCHWELLEN.kaliumHochMg)
      out.push({ code, text: `Viel Kalium (${runde(r.pro.kalium)} mg pro Portion)` })
  }
  return out
}

// ─── Filter ──────────────────────────────────────────────────────────────────

export type Sortierung = 'relevanz' | 'kcal-auf' | 'kcal-ab' | 'zeit' | 'ballast'

export interface FilterZustand {
  suche: string
  mahlzeiten: Mahlzeit[]
  kcal: string | null
  arten: Ernaehrungsart[]
  reihe: string | null
  gesundheit: GesundheitsFilter[]
  darmArt: DarmArt | null
  maxZeit: number | null
  nurLeicht: boolean
  sortierung: Sortierung
  nurEigene: boolean
  nurFavoriten: boolean
}

export const LEERER_FILTER: FilterZustand = {
  suche: '', mahlzeiten: [], kcal: null, arten: [], reihe: null, gesundheit: [], darmArt: null,
  maxZeit: null, nurLeicht: false, sortierung: 'relevanz', nurEigene: false, nurFavoriten: false,
}

export function filterAktiv(f: FilterZustand): boolean {
  return !!(f.suche.trim() || f.mahlzeiten.length || f.kcal || f.arten.length || f.reihe || f.gesundheit.length
    || f.darmArt || f.maxZeit || f.nurLeicht || f.nurEigene || f.nurFavoriten || f.sortierung !== 'relevanz')
}

export function filterAnzahl(f: FilterZustand): number {
  return f.mahlzeiten.length + (f.kcal ? 1 : 0) + f.arten.length + (f.reihe ? 1 : 0) + f.gesundheit.length
    + (f.darmArt ? 1 : 0) + (f.maxZeit ? 1 : 0) + (f.nurLeicht ? 1 : 0) + (f.nurEigene ? 1 : 0) + (f.nurFavoriten ? 1 : 0)
}

export interface Persoenlich {
  /** Ausschlussliste des Nutzers */
  ausschluesse: Ausschluss[]
  /** Ergebnis aus der Anamnese, nur gesetzt wenn der Schalter an ist */
  anamnese: AnamneseProfil | null
  /** IDs der Favoriten (für den Filter „Nur Favoriten“) */
  favoriten?: ReadonlySet<string>
}

export interface Treffer {
  r: Rezept
  /** weiche Ausschlüsse („Schmeckt mir nicht“), die auf das Rezept zutreffen */
  weich: string[]
  /** Hinweise zu Diagnosen aus der Anamnese */
  warnungen: DiagnoseWarnung[]
  /** Harte Ausschlüsse, die trotzdem zutreffen (nur bei Empfehlungen sichtbar, sonst ist das Rezept ausgeblendet) */
  konflikte?: string[]
}

export function passtZuFilter(r: Rezept, f: FilterZustand, favoriten?: ReadonlySet<string>): boolean {
  const q = normalisiere(f.suche)
  if (q) {
    const such = normalisiere(r.suchtext)
    if (!woerter(q).every(w => such.includes(w))) return false
  }
  if (f.mahlzeiten.length && !f.mahlzeiten.some(m => r.mahlzeiten.includes(m))) return false
  if (f.kcal) {
    const s = KCAL_SPANNEN.find(x => x.id === f.kcal)
    if (s && !(r.pro.kcal >= s.von && r.pro.kcal < s.bis)) return false
  }
  if (!f.arten.every(a => r.arten.includes(a))) return false
  if (f.reihe && !r.alleReihen.includes(f.reihe)) return false
  for (const g of f.gesundheit) {
    if (g === 'ballast' && !r.gesundheit.ballaststoffreich) return false
    if (g === 'aox' && r.gesundheit.antioxidantien < 2) return false
    if (g === 'darm' && !r.gesundheit.darmfreundlich && !r.gesundheit.leichtVerdaulich) return false
    if (g === 'omega3' && !r.gesundheit.entzuendungshemmend) return false
    if (g === 'pflanzen' && r.pflanzen.length < SCHWELLEN.pflanzenReich) return false
  }
  if (f.darmArt === 'praebiotisch' && !r.gesundheit.praebiotisch) return false
  if (f.darmArt === 'probiotisch' && !r.gesundheit.probiotisch) return false
  if (f.darmArt === 'leicht' && !r.gesundheit.leichtVerdaulich) return false
  if (f.maxZeit && r.zeitMin > f.maxZeit) return false
  if (f.nurLeicht && r.schwierigkeit > 1) return false
  if (f.nurEigene && r.quelle !== 'ki') return false
  if (f.nurFavoriten && !favoriten?.has(r.id)) return false
  return true
}

/**
 * Wendet Suche/Filter und persönliche Einschränkungen an.
 * Harte Ausschlüsse (Allergie/Unverträglichkeit, Anamnese) blenden das Rezept aus,
 * weiche („Schmeckt mir nicht“) und Diagnose-Hinweise sortieren es nach hinten.
 */
export function wendeAn(alle: Rezept[], f: FilterZustand, p: Persoenlich): { treffer: Treffer[]; ausgeblendet: number } {
  const harteBegriffe = p.ausschluesse.filter(a => a.art === 'hart')
  const weicheBegriffe = p.ausschluesse.filter(a => a.art === 'weich')
  const anamneseRegeln = p.anamnese ? p.anamnese.harte.map(h => REGELN.find(r => r.id === h.regelId)!).filter(Boolean) : []
  const diagnoseCodes = p.anamnese ? p.anamnese.diagnosen.map(d => d.code) : []

  let ausgeblendet = 0
  const treffer: Treffer[] = []
  for (const r of alle) {
    if (!passtZuFilter(r, f, p.favoriten)) continue
    if (harteBegriffe.some(a => ausschlussTrifft(r, a.begriff)) || anamneseRegeln.some(rg => rg.trifft(r))) {
      ausgeblendet++
      continue
    }
    treffer.push({
      r,
      weich: weicheBegriffe.filter(a => ausschlussTrifft(r, a.begriff)).map(a => a.begriff),
      warnungen: diagnoseWarnungen(r, diagnoseCodes),
    })
  }

  const strafe = (t: Treffer) => (t.weich.length ? 2 : 0) + (t.warnungen.length ? 1 : 0)
  const vergleich: Record<Sortierung, (a: Treffer, b: Treffer) => number> = {
    relevanz: () => 0,
    'kcal-auf': (a, b) => a.r.pro.kcal - b.r.pro.kcal,
    'kcal-ab': (a, b) => b.r.pro.kcal - a.r.pro.kcal,
    zeit: (a, b) => a.r.zeitMin - b.r.zeitMin,
    ballast: (a, b) => b.r.pro.ballast - a.r.pro.ballast,
  }
  // Array.sort ist stabil: ohne Sortierwunsch bleibt die Reihenfolge der Bibliothek erhalten
  treffer.sort((a, b) => strafe(a) - strafe(b) || vergleich[f.sortierung](a, b))
  return { treffer, ausgeblendet }
}

// ─── Tagesvorschläge (Ballaststoffe) ─────────────────────────────────────────

export interface TagesStand {
  /** Ballaststoffe, die bereits im Tagebuch stehen (nur Einträge mit Angabe) */
  ballast: number
  /** gegessene kcal heute */
  kcal: number
  kcalZiel: number
  /** Mahlzeiten mit mindestens einem Eintrag */
  belegt: Mahlzeit[]
}

export function naechsteMahlzeit(belegt: Mahlzeit[], stunde: number): Mahlzeit {
  const reihe: Mahlzeit[] = ['Frühstück', 'Mittagessen', 'Abendessen']
  const zeitlich: Mahlzeit = stunde < 10 ? 'Frühstück' : stunde < 15 ? 'Mittagessen' : stunde < 21 ? 'Abendessen' : 'Snack'
  if (zeitlich === 'Snack') return 'Snack'
  const ab = reihe.slice(reihe.indexOf(zeitlich))
  return ab.find(m => !belegt.includes(m)) ?? 'Snack'
}

export interface Vorschlag { t: Treffer; mahlzeit: Mahlzeit; ballast: number }

/**
 * Welche Rezepte schließen den Tag sinnvoll ab? Sie sollen in das verbleibende Kalorienbudget passen
 * und möglichst viele der noch fehlenden Ballaststoffe liefern.
 */
export function tagesVorschlaege(
  treffer: Treffer[], stand: TagesStand, mahlzeit: Mahlzeit, anzahl = 5,
): Vorschlag[] {
  const restKcal = stand.kcalZiel - stand.kcal
  const restBallast = Math.max(0, SCHWELLEN.ballaststoffTagesziel - stand.ballast)
  if (restBallast <= 0 || restKcal < 60) return []
  // Eine Mahlzeit soll das Budget nicht komplett sprengen: bei „Snack“ nur ein Teil des Rests
  const budget = mahlzeit === 'Snack' ? Math.min(restKcal, 250) : restKcal
  return treffer
    .filter(t => t.r.mahlzeiten.includes(mahlzeit) && t.r.pro.kcal <= budget && t.r.pro.ballast >= 3)
    .map(t => {
      const nutzen = Math.min(t.r.pro.ballast, restBallast)
      // Ballaststoffe je 100 kcal belohnen, Überschreiten des Rest-Budgets bestrafen
      const dichte = (t.r.pro.ballast / Math.max(t.r.pro.kcal, 1)) * 100
      const wert = nutzen * 2 + dichte * 3 - (t.weich.length ? 20 : 0) - (t.warnungen.length ? 8 : 0)
      return { t, mahlzeit, ballast: t.r.pro.ballast, wert }
    })
    .sort((a, b) => b.wert - a.wert)
    .slice(0, anzahl)
    .map(({ t, mahlzeit: m, ballast }) => ({ t, mahlzeit: m, ballast }))
}

// ─── Rezept des Tages ────────────────────────────────────────────────────────

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * Wählt pro Nutzer und Kalendertag ein festes Rezept (bleibt den ganzen Tag gleich, wechselt täglich).
 * Rezepte, die zu den Einschränkungen nicht passen, sind schon ausgeblendet; „Schmeckt mir nicht“ und
 * Diagnose-Hinweise werden nur gewählt, wenn nichts anderes übrig ist.
 */
export function rezeptDesTages(treffer: Treffer[], userId: string, datum: string): Treffer | null {
  const sauber = treffer.filter(t => t.weich.length === 0 && t.warnungen.length === 0)
  const pool = (sauber.length > 0 ? sauber : treffer).filter(t => t.r.quelle === 'start')
  const kandidaten = pool.length > 0 ? pool : treffer
  if (kandidaten.length === 0) return null
  // nach ID sortieren, damit neue KI-Rezepte die Auswahl eines Tages nicht verschieben
  const sortiert = [...kandidaten].sort((a, b) => a.r.id.localeCompare(b.r.id))
  return sortiert[hash(`${userId}|${datum}`) % sortiert.length]
}

// ─── Bewertung einzelner Rezepte (z. B. Coach-Empfehlungen) ──────────────────

/** Welche harten Ausschlüsse (Ausschlussliste, Anamnese) treffen auf das Rezept zu? */
export function harteKonflikte(r: Rezept, p: Persoenlich): string[] {
  const treffer = new Set<string>()
  for (const a of p.ausschluesse) if (a.art === 'hart' && ausschlussTrifft(r, a.begriff)) treffer.add(a.begriff)
  for (const h of p.anamnese?.harte ?? []) {
    const regel = REGELN.find(x => x.id === h.regelId)
    if (regel?.trifft(r)) treffer.add(h.label)
  }
  return [...treffer]
}

/** Bewertet ein Rezept ohne es auszublenden: alle Konflikte, Abneigungen und Hinweise werden mitgegeben */
export function bewerte(r: Rezept, p: Persoenlich): Treffer {
  return {
    r,
    weich: p.ausschluesse.filter(a => a.art === 'weich' && ausschlussTrifft(r, a.begriff)).map(a => a.begriff),
    warnungen: diagnoseWarnungen(r, p.anamnese?.diagnosen.map(d => d.code) ?? []),
    konflikte: harteKonflikte(r, p),
  }
}
