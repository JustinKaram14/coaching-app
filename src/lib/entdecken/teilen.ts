// Texte zum Teilen (Nachrichten, Notizen) und Hilfen fürs Teilen und Drucken.

import type { EinkaufsListe } from './einkauf'
import type { Rezept } from './types'
import { ZUTATEN, zutatZeile } from './zutaten'

const kommaZahl = (n: number, stellen = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen })

export function portionenTextKurz(n: number): string {
  const ganz = Math.floor(n)
  return n - ganz >= 0.25 && n - ganz < 0.75 ? (ganz === 0 ? '½' : `${ganz}½`) : String(Math.round(n))
}

export function rezeptText(r: Rezept, portionen: number): string {
  const faktor = portionen / r.portionen
  const zeilen = [
    `🍽️ ${r.name}`,
    `${r.zeitMin} Min. · ${r.pro.kcal ? kommaZahl(r.pro.kcal) : '0'} kcal pro Portion · Zutaten für ${portionenTextKurz(portionen)} ${portionen === 1 ? 'Portion' : 'Portionen'}`,
    '',
    'Zutaten',
    ...r.zutaten.flatMap(z => (ZUTATEN[z.id] ? [`• ${zutatZeile(ZUTATEN[z.id], z.g * faktor)}`] : [])),
    '',
    'Anleitung',
    ...r.schritte.map((s, i) => `${i + 1}. ${s}`),
    '',
    `Nährwerte pro Portion (geschätzt): Eiweiß ${kommaZahl(r.pro.protein)} g · Kohlenhydrate ${kommaZahl(r.pro.kh)} g · Fett ${kommaZahl(r.pro.fett)} g · Ballaststoffe ${kommaZahl(r.pro.ballast)} g`,
    'Aus HLX Together',
  ]
  return zeilen.join('\n')
}

export function listeText(liste: EinkaufsListe, abgehakt: ReadonlySet<string>): string {
  const zeilen = ['🛒 Einkaufsliste']
  for (const b of liste.bereiche) {
    const offen = b.zeilen.filter(z => !abgehakt.has(z.id))
    if (offen.length === 0) continue
    zeilen.push('', b.name, ...offen.map(z => `• ${z.text}`))
  }
  return zeilen.join('\n')
}

export type TeilenErgebnis = 'geteilt' | 'kopiert' | 'abgebrochen' | 'fehler'

/** Öffnet das Teilen-Menü des Geräts, sonst wird der Text in die Zwischenablage kopiert */
export async function teile(titel: string, text: string): Promise<TeilenErgebnis> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: titel, text })
      return 'geteilt'
    }
    await navigator.clipboard.writeText(text)
    return 'kopiert'
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'abgebrochen' : 'fehler'
  }
}
