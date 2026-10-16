// Beschriftungen und Definitionen für die Entdecken-Oberfläche.
// Die Zahlen in den Erklärtexten kommen aus SCHWELLEN, damit Anzeige und Berechnung nie auseinanderlaufen.

import type { Ernaehrungsart, Mahlzeit } from './types'
import { SCHWELLEN } from './engine'

export const KEINE_AERZTLICHE_EMPFEHLUNG = 'Keine ärztliche Empfehlung'

export const KATEGORIEN: { id: Mahlzeit; emoji: string; text: string }[] = [
  { id: 'Frühstück', emoji: '🌅', text: 'Gut in den Tag' },
  { id: 'Mittagessen', emoji: '☀️', text: 'Satt und fit' },
  { id: 'Abendessen', emoji: '🌙', text: 'Zum Feierabend' },
  { id: 'Snack', emoji: '🍎', text: 'Für zwischendurch' },
]

export interface KcalSpanne { id: string; von: number; bis: number; label: string }
export const KCAL_SPANNEN: KcalSpanne[] = [
  { id: '50-100', von: 0, bis: 100, label: '50–100 kcal' },
  { id: '100-200', von: 100, bis: 200, label: '100–200 kcal' },
  { id: '200-300', von: 200, bis: 300, label: '200–300 kcal' },
  { id: '300-400', von: 300, bis: 400, label: '300–400 kcal' },
  { id: '400-500', von: 400, bis: 500, label: '400–500 kcal' },
  { id: '500-600', von: 500, bis: 600, label: '500–600 kcal' },
  { id: '600+', von: 600, bis: Infinity, label: 'ab 600 kcal' },
]

export const ARTEN: { id: Ernaehrungsart; label: string; emoji: string; info: string }[] = [
  { id: 'vegetarisch', label: 'Vegetarisch', emoji: '🥕', info: 'Kein Fleisch und kein Fisch; Ei und Milchprodukte sind erlaubt.' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱', info: 'Nur pflanzliche Zutaten, auch ohne Ei, Milchprodukte und Honig.' },
  { id: 'pescetarisch', label: 'Pescetarisch', emoji: '🐟', info: 'Kein Fleisch, aber Fisch und Meeresfrüchte sind erlaubt.' },
  { id: 'lowcarb', label: 'Low Carb', emoji: '🥑', info: `Höchstens ${SCHWELLEN.lowCarbAnteil * 100} % der Energie aus Kohlenhydraten.` },
  { id: 'lowfat', label: 'Low Fat', emoji: '🥗', info: `Höchstens ${SCHWELLEN.lowFatAnteil * 100} % der Energie aus Fett.` },
  { id: 'kalorienarm', label: 'Kalorienarm', emoji: '🪶', info: `Höchstens ${SCHWELLEN.kalorienarmKcal} kcal pro Portion.` },
  { id: 'highprotein', label: 'High Protein', emoji: '💪', info: `Mindestens ${SCHWELLEN.highProteinAnteil * 100} % der Energie aus Eiweiß und mindestens ${SCHWELLEN.highProteinMinG} g pro Portion.` },
  { id: 'keto', label: 'Ketogen', emoji: '🥓', info: `Höchstens ${SCHWELLEN.ketoKhAnteil * 100} % der Energie aus verwertbaren Kohlenhydraten (ohne Ballaststoffe) und mindestens ${SCHWELLEN.ketoFettAnteil * 100} % aus Fett.` },
  { id: 'glutenfrei', label: 'Glutenfrei', emoji: '🌾', info: 'Keine glutenhaltige Zutat (Weizen, Roggen, Gerste, Hafer). Bei Zöliakie bitte auf zertifizierte Produkte achten, Kreuzkontamination ist nicht erfasst.' },
  { id: 'laktosefrei', label: 'Laktosefrei', emoji: '🥛', info: 'Keine laktosehaltige Zutat. Hartkäse und Butter enthalten nur Spuren von Laktose und gelten hier als laktosefrei.' },
]

export interface ReiheMeta { id: string; label: string; emoji: string; info?: string }
export const REIHEN: ReiheMeta[] = [
  { id: 'salat', label: 'Salat', emoji: '🥗' },
  { id: 'suppe', label: 'Suppe', emoji: '🍲' },
  { id: 'schnell', label: 'Schnell zubereitet', emoji: '⚡', info: `${SCHWELLEN.schnellMin} Minuten oder weniger.` },
  { id: 'wenig-zutaten', label: 'Wenig Zutaten', emoji: '🧺', info: `Höchstens ${SCHWELLEN.wenigZutaten} Hauptzutaten, ohne Salz, Öl, Gewürze, Kräuter und Zitronensaft.` },
  { id: 'bowl', label: 'Bowls', emoji: '🥣' },
  { id: 'pfanne', label: 'Pfanne & Topf', emoji: '🍳' },
  { id: 'ofen', label: 'Aus dem Ofen', emoji: '🔥' },
  { id: 'meal-prep', label: 'Meal Prep', emoji: '🥡', info: 'Hält sich im Kühlschrank und lässt sich vorbereiten.' },
  { id: 'suess', label: 'Süßes', emoji: '🍓' },
]

export const GESUNDHEIT_REIHEN = {
  ballast: {
    label: 'Ballaststoffreich', emoji: '🌾',
    info: `Mindestens ${SCHWELLEN.ballaststoffReichG} g Ballaststoffe pro Portion, also ein Drittel des Tagesziels von ${SCHWELLEN.ballaststoffTagesziel} g.`,
  },
  aox: {
    label: 'Antioxidantienreich', emoji: '🫐',
    info: 'Einfacher Punktewert von 1 bis 3, geschätzt aus Zutaten wie Beeren, Blattgemüse, Tomaten, Kakao und Kräutern und deren Menge. Er misst keine Laborwerte.',
  },
  darm: {
    label: 'Darmfreundlich', emoji: '🫶',
    info: 'Präbiotisch (Ballaststoffe als Futter für Darmbakterien, z. B. Zwiebel, Knoblauch, Lauch, Topinambur, Hafer), probiotisch (enthält Joghurt, Kefir, Buttermilch, Sauerkraut, Kimchi oder Miso, ungekocht), fermentiert (vergorene Lebensmittel wie Kimchi, Sauerkraut, Miso, Tempeh, Kefir) oder leicht verdaulich (wenig Fett, keine größere Menge blähender Zutaten). Ob lebende Kulturen enthalten sind, hängt vom Produkt ab; Erhitzen zerstört sie.',
  },
  pflanzen: {
    label: 'Pflanzenvielfalt', emoji: '🌱',
    info: `Mindestens ${SCHWELLEN.pflanzenReich} verschiedene Pflanzen im Rezept (Gemüse, Obst, Getreide, Hülsenfrüchte, Nüsse, Samen, Kräuter). Jede Pflanze zählt einmal, die Menge ist egal. Das hilft beim Wochenziel „30 Pflanzen“.`,
  },
  omega3: {
    label: 'Entzündungshemmend / Omega-3', emoji: '🐟',
    info: `Mindestens ${SCHWELLEN.omega3ReichMg / 1000} g Omega-3-Fettsäuren pro Portion (z. B. aus fettem Fisch, Walnüssen, Leinsamen, Chia) oder etwas weniger zusammen mit vielen Antioxidantien.`,
  },
} as const
export type GesundheitsFilter = keyof typeof GESUNDHEIT_REIHEN

export const DARM_ARTEN = [
  { id: 'praebiotisch', label: 'Präbiotisch' },
  { id: 'probiotisch', label: 'Probiotisch' },
  { id: 'fermentiert', label: 'Fermentiert' },
  { id: 'leicht', label: 'Leicht verdaulich' },
] as const
export type DarmArt = typeof DARM_ARTEN[number]['id']

export const SCHWIERIGKEIT = ['Leicht', 'Mittel', 'Anspruchsvoll'] as const

/** Vorschläge für die Ausschlussliste */
export const AUSSCHLUSS_VORSCHLAEGE = [
  'Laktose', 'Gluten', 'Nüsse', 'Erdnüsse', 'Eier', 'Soja', 'Fisch', 'Meeresfrüchte', 'Sesam', 'Sellerie', 'Senf',
  'Pilze', 'Zwiebel', 'Knoblauch', 'Kohl', 'Avocado', 'Hülsenfrüchte', 'Fleisch',
]
