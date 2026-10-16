import type { Mahlzeit, RezeptDef } from '../types'

const MAP: Record<string, Mahlzeit> = { F: 'Frühstück', M: 'Mittagessen', A: 'Abendessen', S: 'Snack' }

/**
 * Kurzschreibweise für Startrezepte.
 * mahlzeiten: Buchstaben F M A S · reihen: Wörter mit Leerzeichen · zutaten: [id, Gramm] für ALLE Portionen zusammen
 */
export function r(
  id: string, name: string, mahlzeiten: string, reihen: string,
  zeitMin: number, schwierigkeit: 1 | 2 | 3, portionen: number,
  zutaten: [string, number][], schritte: string[], beschreibung?: string,
): RezeptDef {
  return {
    id, name, beschreibung,
    mahlzeiten: mahlzeiten.split('').map(c => MAP[c]),
    reihen: reihen.split(' ').filter(w => w && w !== 'vegan'),
    zeitMin, schwierigkeit, portionen,
    zutaten: zutaten.map(([zid, g]) => ({ id: zid, g })),
    schritte, quelle: 'start',
  }
}
