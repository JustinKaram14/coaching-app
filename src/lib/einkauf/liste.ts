// Gemeinsame Einkaufsliste: Entdecken-Rezepte, eigene Rezepte (Zutatentext) und eigene Artikel,
// zusammengerechnet, nach Supermarkt-Bereichen sortiert und mit Kostenprognose.

import type { EinkaufsEintrag, EinkaufsListe, EinkaufsZeile } from '../entdecken/einkauf'
import { bereichFuer } from '../entdecken/einkauf'
import type { Rezept as EntdeckenRezept } from '../entdecken/types'
import { ZUTATEN, zutatZeile } from '../entdecken/zutaten'
import type { Rezept as EigenesRezept } from '../../types/database'
import { KEINE_KOSTEN, addiere, extraArtikel, kostenFuer, kostenZeile, leseZeile, leseZutatentext, norm, type Kosten } from './preise'

/** Eigene Rezepte stehen mit diesem Präfix in `rezept_einkauf` */
export const EIGEN_PRAEFIX = 'eigen:'

export interface EigenerArtikel {
  id: string
  text: string
}

export interface ListeMitKosten extends EinkaufsListe {
  kosten: Kosten
  /** Kosten je Eintrag (Rezept) für die gewählten Portionen */
  kostenJeEintrag: Map<string, Kosten>
}

const REIHENFOLGE = [
  'Obst & Gemüse', 'Brot, Getreide & Nudeln', 'Hülsenfrüchte & Soja', 'Milch & Eier', 'Fleisch & Fisch',
  'Nüsse, Samen & Trockenfrüchte', 'Konserven & Vorrat', 'Öle & Gewürze', 'Sonstiges', 'Eigene Artikel',
]

function bereichFuerZiel(ziel: string): string {
  return extraArtikel(ziel)?.bereich ?? bereichFuer(ziel)
}

function zeilenText(ziel: string, gramm: number, ohneMenge: boolean): string {
  const extra = extraArtikel(ziel)
  if (!extra) {
    const z = ZUTATEN[ziel]
    // Salz und Gewürze kauft man nicht nach Gramm
    if (ziel === 'salz' || ziel === 'gewuerze') return z.name
    return gramm > 0 ? zutatZeile(z, gramm) + (ohneMenge ? ' + etwas' : '') : z.name.replace(/\s*\(.*?\)/, '')
  }
  if (gramm <= 0) return extra.name
  if (extra.stueck) {
    const n = gramm / extra.stueck
    const r = Math.round(n * 2) / 2
    if (r >= 1 && r <= 12 && Math.abs(r - n) / n < 0.15) return `${String(r).replace('.', ',')} × ${extra.name}`
  }
  const g = gramm >= 10 ? Math.round(gramm / 5) * 5 : Math.round(gramm * 2) / 2
  return `${String(g).replace('.', ',')} g ${extra.name}`
}

export function baueGemeinsameListe(
  eintraege: EinkaufsEintrag[],
  entdecken: ReadonlyMap<string, EntdeckenRezept>,
  eigene: ReadonlyMap<string, EigenesRezept>,
  artikel: EigenerArtikel[],
): ListeMitKosten {
  const summe = new Map<string, { g: number; ohneMenge: boolean; aus: Set<string> }>()
  const sonstiges = new Map<string, { text: string; aus: Set<string> }>()
  const verwaist: EinkaufsEintrag[] = []
  const kostenJeEintrag = new Map<string, Kosten>()
  let kosten = KEINE_KOSTEN

  const nimm = (ziel: string, g: number | null, rezept: string) => {
    const alt = summe.get(ziel) ?? { g: 0, ohneMenge: false, aus: new Set<string>() }
    if (g === null) alt.ohneMenge = true; else alt.g += g
    alt.aus.add(rezept)
    summe.set(ziel, alt)
  }

  for (const e of eintraege) {
    let k = KEINE_KOSTEN
    if (e.rezeptId.startsWith(EIGEN_PRAEFIX)) {
      const r = eigene.get(e.rezeptId.slice(EIGEN_PRAEFIX.length))
      if (!r) { verwaist.push(e); continue }
      const faktor = e.portionen / Math.max(1, r.portionen || 1)
      for (const z of leseZutatentext(r.zutaten_text)) {
        const kz = kostenZeile(z, faktor)
        if (!kz) continue
        k = addiere(k, kz)
        if (z.ziel) { nimm(z.ziel, z.gramm === null ? null : z.gramm * faktor, r.name); continue }
        const key = norm(z.text)
        const alt = sonstiges.get(key) ?? { text: z.text, aus: new Set<string>() }
        alt.aus.add(r.name)
        sonstiges.set(key, alt)
      }
    } else {
      const r = entdecken.get(e.rezeptId)
      if (!r) { verwaist.push(e); continue }
      const faktor = e.portionen / r.portionen
      for (const z of r.zutaten) {
        if (!ZUTATEN[z.id] || z.id === 'wasser') continue
        nimm(z.id, z.g * faktor, r.name)
        k = addiere(k, kostenFuer(z.id, z.g * faktor))
      }
    }
    kostenJeEintrag.set(e.id, k)
    kosten = addiere(kosten, k)
  }

  const nachBereich = new Map<string, EinkaufsZeile[]>()
  const sortName = new Map<string, string>()
  const dazu = (bereich: string, zeile: EinkaufsZeile) => {
    const liste = nachBereich.get(bereich) ?? []
    liste.push(zeile)
    nachBereich.set(bereich, liste)
  }
  for (const [ziel, { g, ohneMenge, aus }] of summe) {
    dazu(bereichFuerZiel(ziel), { id: ziel, text: zeilenText(ziel, g, ohneMenge && g > 0), gramm: g, aus: [...aus] })
    sortName.set(ziel, extraArtikel(ziel)?.name ?? ZUTATEN[ziel]?.name ?? ziel)
  }
  for (const [key, { text, aus }] of sonstiges) dazu('Sonstiges', { id: `r:${key}`, text, gramm: 0, aus: [...aus] })

  // Eigene Artikel: werden, wenn möglich, auch bepreist („2 l Milch“, „Bananen“)
  for (const a of artikel) {
    dazu('Eigene Artikel', { id: `a:${a.id}`, text: a.text, gramm: 0, aus: [] })
    const z = leseZeile(a.text)
    const kz = z && kostenZeile(z)
    if (kz) kosten = addiere(kosten, kz)
  }

  const bereiche = REIHENFOLGE.filter(b => nachBereich.has(b)).map(name => ({
    name,
    zeilen: name === 'Eigene Artikel' ? nachBereich.get(name)! : nachBereich.get(name)!.sort((a, b) => (sortName.get(a.id) ?? a.text).localeCompare(sortName.get(b.id) ?? b.text, 'de')),
  }))
  return { bereiche, verwaist, anzahl: bereiche.reduce((s, b) => s + b.zeilen.length, 0), kosten, kostenJeEintrag }
}
