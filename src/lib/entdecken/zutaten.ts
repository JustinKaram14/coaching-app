// Zutaten-Datenbank für „Entdecken“.
// Werte pro 100 g, gerundet aus gängigen Nährwerttabellen (BLS/USDA) – Schätzwerte, keine Laborwerte.
// Reihenfolge der Zahlen: kcal, Eiweiß, Kohlenhydrate, Ballaststoffe, Zucker, Fett, gesättigt, einfach, mehrfach,
// Cholesterin (mg), Natrium (mg), Kalium (mg), Omega-3 (mg)

import type { Allergen, Herkunft, Naehrwerte100, Zutat } from './types'

type Zahlen = [number, number, number, number, number, number, number, number, number, number, number, number, number]

interface Opt {
  /** Allergene */
  a?: Allergen[]
  /** enthält Laktose */
  lak?: boolean
  /** Antioxidantien-Stufe 0–3 */
  aox?: number
  /** Präbiotikum-Gewicht */
  pre?: number
  /** Probiotikum ab g pro Portion */
  pro?: number
  /** Fermentiert ab g pro Portion */
  fe?: number
  /** FODMAP-reich */
  fod?: boolean
  /** Gewicht gekocht / roh */
  q?: number
  /** Einheit: [Name, Plural, Gramm, Stück?] */
  u?: [string, string, number, boolean]
  /** Suchwörter */
  al?: string[]
  /** Basiszutat (Salz, Öl, Gewürz, Wasser) */
  basis?: boolean
  plural?: string
}

function z(id: string, name: string, typ: Herkunft, d: Zahlen, o: Opt = {}): Zutat {
  const n: Naehrwerte100 = {
    kcal: d[0], protein: d[1], kh: d[2], ballast: d[3], zucker: d[4], fett: d[5],
    gesaettigt: d[6], einfach: d[7], mehrfach: d[8], cholesterin: d[9], natrium: d[10], kalium: d[11], omega3: d[12],
  }
  return {
    id, name, plural: o.plural, typ, n,
    allergene: o.a ?? [],
    laktose: o.lak ?? false,
    aox: o.aox ?? 0,
    pre: o.pre ?? 0,
    pro: o.pro ?? 0,
    ferm: o.fe ?? 0,
    fodmap: o.fod ?? false,
    quellung: o.q ?? 1,
    einheit: o.u ? { n: o.u[0], p: o.u[1], g: o.u[2], stueck: o.u[3] } : undefined,
    alias: o.al ?? [],
    basis: o.basis ?? false,
    pflanze: typ === 'pflanze' && !o.basis,
  }
}

const P: Herkunft = 'pflanze'

const LISTE: Zutat[] = [
  // ── Gemüse ─────────────────────────────────────────────────────────────
  z('tomate', 'Tomate', P, [18, 0.9, 3.9, 1.2, 2.6, 0.2, 0.05, 0.03, 0.1, 0, 5, 237, 3], { aox: 2, u: ['Tomate', 'Tomaten', 120, true], plural: 'Tomaten' }),
  z('kirschtomaten', 'Kirschtomaten', P, [18, 0.9, 3.9, 1.2, 2.6, 0.2, 0.05, 0.03, 0.1, 0, 5, 237, 3], { aox: 2, al: ['tomate', 'tomaten'] }),
  z('tomaten_stueckig', 'Stückige Tomaten (Dose)', P, [24, 1.2, 4.5, 1.5, 3.5, 0.1, 0.02, 0.02, 0.05, 0, 10, 290, 2], { aox: 2, al: ['tomate', 'tomaten'] }),
  z('tomatenmark', 'Tomatenmark', P, [82, 4.3, 19, 4.1, 12.2, 0.5, 0.1, 0.1, 0.2, 0, 59, 1014, 5], { aox: 3, al: ['tomate', 'tomaten'], u: ['EL', 'EL', 15, false] }),
  z('gurke', 'Gurke', P, [15, 0.7, 3.6, 0.5, 1.7, 0.1, 0, 0, 0, 0, 2, 147, 0], { u: ['Gurke', 'Gurken', 300, true], plural: 'Gurken' }),
  z('paprika', 'Paprika', P, [31, 1, 6, 2.1, 4.2, 0.3, 0.06, 0.03, 0.17, 0, 4, 211, 10], { aox: 2, u: ['Paprika', 'Paprika', 160, true] }),
  z('zwiebel', 'Zwiebel', P, [40, 1.1, 9.3, 1.7, 4.2, 0.1, 0.04, 0.01, 0.02, 0, 4, 146, 0], { aox: 1, pre: 1, fod: true, u: ['Zwiebel', 'Zwiebeln', 80, true], plural: 'Zwiebeln' }),
  z('rote_zwiebel', 'Rote Zwiebel', P, [40, 1.1, 9.3, 1.7, 4.2, 0.1, 0.04, 0.01, 0.02, 0, 4, 146, 0], { aox: 2, pre: 1, fod: true, al: ['zwiebel'], u: ['rote Zwiebel', 'rote Zwiebeln', 80, true] }),
  z('knoblauch', 'Knoblauch', P, [149, 6.4, 33, 2.1, 1, 0.5, 0.09, 0.01, 0.25, 0, 17, 401, 0], { aox: 1, pre: 4, fod: true, u: ['Knoblauchzehe', 'Knoblauchzehen', 4, true] }),
  z('karotte', 'Karotte', P, [41, 0.9, 9.6, 2.8, 4.7, 0.2, 0.04, 0.01, 0.12, 0, 69, 320, 2], { aox: 2, u: ['Karotte', 'Karotten', 80, true], al: ['möhre', 'möhren'] }),
  z('brokkoli', 'Brokkoli', P, [34, 2.8, 6.6, 2.6, 1.7, 0.4, 0.04, 0.01, 0.03, 0, 33, 316, 40], { aox: 3 }),
  z('spinat', 'Spinat', P, [23, 2.9, 3.6, 2.2, 0.4, 0.4, 0.06, 0.01, 0.17, 0, 79, 558, 140], { aox: 3, al: ['blattspinat'] }),
  z('gruenkohl', 'Grünkohl', P, [49, 4.3, 8.8, 3.6, 2.3, 0.9, 0.1, 0.05, 0.34, 0, 38, 491, 180], { aox: 3, fod: true, al: ['kohl'] }),
  z('zucchini', 'Zucchini', P, [17, 1.2, 3.1, 1, 2.5, 0.3, 0.08, 0.03, 0.1, 0, 8, 261, 10], { aox: 1, u: ['Zucchini', 'Zucchini', 250, true] }),
  z('aubergine', 'Aubergine', P, [25, 1, 5.9, 3, 3.5, 0.2, 0.03, 0.02, 0.07, 0, 2, 229, 0], { aox: 2, u: ['Aubergine', 'Auberginen', 300, true] }),
  z('blumenkohl', 'Blumenkohl', P, [25, 1.9, 5, 2, 1.9, 0.3, 0.13, 0.03, 0.04, 0, 30, 299, 10], { aox: 1, fod: true, al: ['kohl'] }),
  z('weisskohl', 'Weißkohl', P, [25, 1.3, 5.8, 2.5, 3.2, 0.1, 0.03, 0.01, 0.03, 0, 18, 170, 10], { aox: 1, fod: true, al: ['kohl'] }),
  z('rotkohl', 'Rotkohl', P, [31, 1.4, 7.4, 2.1, 3.8, 0.2, 0.02, 0.02, 0.07, 0, 27, 243, 20], { aox: 3, fod: true, al: ['kohl'] }),
  z('suesskartoffel', 'Süßkartoffel', P, [86, 1.6, 20, 3, 4.2, 0.1, 0.02, 0, 0.01, 0, 55, 337, 0], { aox: 2, u: ['Süßkartoffel', 'Süßkartoffeln', 250, true], al: ['kartoffel'] }),
  z('kartoffel', 'Kartoffel', P, [77, 2, 17, 2.2, 0.8, 0.1, 0.03, 0, 0.04, 0, 6, 421, 0], { aox: 1, u: ['Kartoffel', 'Kartoffeln', 90, true], plural: 'Kartoffeln' }),
  z('kuerbis', 'Hokkaido-Kürbis', P, [26, 1, 6.5, 2.4, 2.8, 0.1, 0.05, 0.01, 0.01, 0, 1, 340, 0], { aox: 2, al: ['kürbis'] }),
  z('lauch', 'Lauch', P, [61, 1.5, 14.2, 1.8, 3.9, 0.3, 0.04, 0.01, 0.16, 0, 20, 180, 10], { aox: 1, pre: 1, fod: true, al: ['porree'] }),
  z('champignons', 'Champignons', P, [22, 3.1, 3.3, 1, 2, 0.3, 0.05, 0.01, 0.16, 0, 5, 318, 0], { aox: 1, al: ['pilz', 'pilze'] }),
  z('rucola', 'Rucola', P, [25, 2.6, 3.7, 1.6, 2.1, 0.7, 0.09, 0.05, 0.35, 0, 27, 369, 170], { aox: 2 }),
  z('blattsalat', 'Blattsalat', P, [15, 1.4, 2.9, 1.3, 0.8, 0.2, 0.03, 0, 0.1, 0, 28, 194, 40], { aox: 1, al: ['salat', 'feldsalat'] }),
  z('avocado', 'Avocado', P, [160, 2, 8.5, 6.7, 0.7, 14.7, 2.1, 9.8, 1.8, 0, 7, 485, 110], { aox: 1, u: ['Avocado', 'Avocados', 150, true] }),
  z('rote_bete', 'Rote Bete', P, [43, 1.6, 9.6, 2.8, 6.8, 0.2, 0.03, 0.03, 0.06, 0, 78, 325, 0], { aox: 2, fod: true }),
  z('topinambur', 'Topinambur', P, [73, 2, 17.4, 1.6, 9.6, 0, 0, 0, 0, 0, 4, 429, 0], { aox: 1, pre: 3, fod: true }),
  z('chicoree', 'Chicorée', P, [17, 0.9, 4, 3.1, 0.7, 0.1, 0, 0, 0, 0, 22, 211, 0], { aox: 1, pre: 2, fod: true }),
  z('spargel', 'Grüner Spargel', P, [20, 2.2, 3.9, 2.1, 1.9, 0.1, 0.04, 0, 0.05, 0, 2, 202, 10], { aox: 1, pre: 1 }),
  z('fenchel', 'Fenchel', P, [31, 1.2, 7.3, 3.1, 3.9, 0.2, 0.05, 0.01, 0.1, 0, 52, 414, 0], { aox: 1, fod: true }),
  z('mais', 'Mais', P, [86, 3.3, 19, 2, 6.3, 1.4, 0.2, 0.4, 0.6, 0, 15, 270, 20], { fod: true }),
  z('erbsen', 'Erbsen', P, [81, 5.4, 14.5, 5.1, 5.7, 0.4, 0.07, 0.04, 0.19, 0, 5, 244, 30], { aox: 1, fod: true }),
  z('gruene_bohnen', 'Grüne Bohnen', P, [31, 1.8, 7, 2.7, 3.3, 0.2, 0.04, 0, 0.1, 0, 6, 211, 40], { aox: 1 }),
  z('ingwer', 'Ingwer', P, [80, 1.8, 18, 2, 1.7, 0.8, 0.2, 0.2, 0.15, 0, 13, 415, 0], { aox: 2 }),
  z('petersilie', 'Petersilie', P, [36, 3, 6.3, 3.3, 0.9, 0.8, 0.13, 0.29, 0.12, 0, 56, 554, 130], { aox: 3 }),
  z('basilikum', 'Basilikum', P, [23, 3.2, 2.7, 1.6, 0.3, 0.6, 0.04, 0.09, 0.39, 0, 4, 295, 320], { aox: 2 }),
  z('schnittlauch', 'Schnittlauch', P, [30, 3.3, 4.4, 2.5, 1.9, 0.7, 0.15, 0.04, 0.2, 0, 3, 296, 70], { aox: 2, pre: 1 }),
  z('minze', 'Minze', P, [70, 3.8, 15, 8, 0, 0.9, 0.2, 0.01, 0.4, 0, 31, 569, 100], { aox: 3 }),
  z('kimchi', 'Kimchi', P, [15, 1.1, 2.4, 1.6, 1, 0.5, 0.1, 0.03, 0.2, 0, 498, 151, 20], { aox: 1, pro: 30, fe: 30, fod: true }),
  z('sauerkraut', 'Sauerkraut', P, [19, 0.9, 4.3, 2.9, 1.8, 0.1, 0.02, 0, 0.03, 0, 661, 170, 10], { aox: 1, pro: 30, fe: 30, fod: true, al: ['kohl'] }),
  z('zitronensaft', 'Zitronensaft', P, [22, 0.4, 6.9, 0.3, 2.5, 0.2, 0.04, 0.01, 0.05, 0, 1, 103, 0], { aox: 1, al: ['zitrone'] }),
  z('oliven', 'Oliven', P, [145, 1, 3.8, 3.3, 0, 15.3, 2, 11, 1.3, 0, 1556, 42, 70], { aox: 1 }),

  // ── Obst ───────────────────────────────────────────────────────────────
  z('apfel', 'Apfel', P, [52, 0.3, 13.8, 2.4, 10.4, 0.2, 0.03, 0.01, 0.05, 0, 1, 107, 10], { aox: 1, u: ['Apfel', 'Äpfel', 170, true] }),
  z('banane', 'Banane', P, [89, 1.1, 22.8, 2.6, 12.2, 0.3, 0.1, 0.03, 0.07, 0, 1, 358, 30], { aox: 1, pre: 1, u: ['Banane', 'Bananen', 120, true] }),
  z('heidelbeeren', 'Heidelbeeren', P, [57, 0.7, 14.5, 2.4, 10, 0.3, 0.03, 0.05, 0.14, 0, 1, 77, 60], { aox: 3, al: ['beeren'] }),
  z('himbeeren', 'Himbeeren', P, [52, 1.2, 11.9, 6.5, 4.4, 0.7, 0.02, 0.06, 0.38, 0, 1, 151, 130], { aox: 3, al: ['beeren'] }),
  z('erdbeeren', 'Erdbeeren', P, [32, 0.7, 7.7, 2, 4.9, 0.3, 0.02, 0.04, 0.16, 0, 1, 153, 65], { aox: 3, al: ['beeren'] }),
  z('orange', 'Orange', P, [47, 0.9, 11.8, 2.4, 9.4, 0.1, 0.01, 0.02, 0.02, 0, 0, 181, 10], { aox: 1, u: ['Orange', 'Orangen', 180, true] }),
  z('mango', 'Mango', P, [60, 0.8, 15, 1.6, 13.7, 0.4, 0.09, 0.14, 0.07, 0, 1, 168, 50], { aox: 1 }),
  z('kiwi', 'Kiwi', P, [61, 1.1, 14.7, 3, 9, 0.5, 0.03, 0.04, 0.29, 0, 3, 312, 40], { aox: 2, u: ['Kiwi', 'Kiwis', 80, true] }),
  z('birne', 'Birne', P, [57, 0.4, 15.2, 3.1, 9.8, 0.1, 0.01, 0.03, 0.05, 0, 1, 116, 0], { aox: 1, u: ['Birne', 'Birnen', 170, true] }),
  z('datteln', 'Datteln', P, [277, 1.8, 75, 6.7, 66.5, 0.2, 0, 0.04, 0.02, 0, 1, 696, 0], { aox: 1, u: ['Dattel', 'Datteln', 25, true] }),
  z('ananas', 'Ananas', P, [50, 0.5, 13, 1.4, 9.9, 0.1, 0.01, 0.01, 0.04, 0, 1, 109, 0], {}),

  // ── Getreide & Beilagen (Rohgewicht) ───────────────────────────────────
  z('haferflocken', 'Haferflocken', P, [379, 13.2, 67.7, 10.1, 1, 6.5, 1.1, 2.2, 2.5, 0, 6, 362, 110], { a: ['gluten'], aox: 1, pre: 1, q: 2.2, al: ['hafer'] }),
  z('vollkornbrot', 'Vollkornbrot', P, [220, 7.5, 38, 8, 3, 1.5, 0.3, 0.3, 0.6, 0, 430, 220, 50], { a: ['gluten'], u: ['Scheibe Vollkornbrot', 'Scheiben Vollkornbrot', 50, true], al: ['brot'] }),
  z('vollkorn_nudeln', 'Vollkornnudeln', P, [348, 13, 67, 10, 3, 2.5, 0.4, 0.4, 1, 0, 8, 400, 40], { a: ['gluten'], q: 2.2, al: ['nudeln', 'pasta'] }),
  z('nudeln', 'Nudeln', P, [358, 12.5, 71, 3, 3, 1.5, 0.3, 0.2, 0.6, 0, 6, 200, 20], { a: ['gluten'], q: 2.2, al: ['pasta'] }),
  z('vollkornreis', 'Vollkornreis', P, [362, 7.5, 76, 3.5, 0.7, 2.8, 0.6, 1, 1, 0, 5, 250, 30], { q: 2.5, al: ['reis'] }),
  z('basmatireis', 'Basmatireis', P, [355, 7.1, 78, 1.3, 0.3, 0.7, 0.2, 0.2, 0.2, 0, 5, 115, 10], { q: 2.5, al: ['reis'] }),
  z('quinoa', 'Quinoa', P, [368, 14.1, 64, 7, 0, 6.1, 0.7, 1.6, 3.3, 0, 5, 563, 260], { aox: 1, q: 2.8 }),
  z('couscous', 'Couscous', P, [376, 12.8, 77, 5, 0.5, 0.6, 0.1, 0.1, 0.3, 0, 10, 166, 10], { a: ['gluten'], q: 2.3 }),
  z('bulgur', 'Bulgur', P, [342, 12.3, 76, 12.5, 0.8, 1.3, 0.2, 0.2, 0.5, 0, 17, 410, 30], { a: ['gluten'], q: 2.5 }),
  z('hirse', 'Hirse', P, [378, 11, 73, 8.5, 0.9, 4.2, 0.7, 0.8, 2.1, 0, 5, 195, 120], { q: 2.5 }),
  z('buchweizen', 'Buchweizen', P, [343, 13.3, 71.5, 10, 0, 3.4, 0.7, 1, 1, 0, 1, 460, 80], { aox: 1, q: 2.3 }),
  z('reisnudeln', 'Reisnudeln', P, [360, 6, 80, 1.6, 0.1, 0.6, 0.2, 0.2, 0.2, 0, 10, 100, 10], { q: 2.2, al: ['nudeln'] }),
  z('wrap', 'Vollkorn-Wrap', P, [310, 8.5, 52, 4, 2.5, 7, 2.9, 3, 1, 0, 650, 150, 30], { a: ['gluten'], u: ['Wrap', 'Wraps', 62, true], al: ['tortilla'] }),
  z('polenta', 'Polenta (Maisgrieß)', P, [362, 8.8, 79, 3.9, 1.5, 1.2, 0.2, 0.3, 0.5, 0, 3, 142, 20], { q: 4, al: ['mais', 'grieß'] }),
  z('vollkornmehl', 'Vollkornmehl', P, [340, 13, 61, 10, 0.5, 2.5, 0.4, 0.3, 1.1, 0, 5, 380, 40], { a: ['gluten'], al: ['mehl', 'weizen'] }),
  z('backpulver', 'Backpulver', P, [53, 0, 28, 0, 0, 0, 0, 0, 0, 0, 10000, 100, 0], { basis: true }),

  // ── Hülsenfrüchte & Soja ───────────────────────────────────────────────
  z('kichererbsen', 'Kichererbsen (Dose, abgetropft)', P, [139, 7.1, 22.5, 6.4, 3.9, 2.8, 0.27, 0.6, 1.2, 0, 247, 172, 100], { aox: 1, pre: 1, fod: true, al: ['kichererbse', 'hülsenfrucht'] }),
  z('linsen_rot', 'Rote Linsen', P, [358, 24, 60, 11, 2, 2.2, 0.3, 0.5, 1, 0, 6, 677, 100], { aox: 1, pre: 1, fod: true, q: 2.5, al: ['linse', 'hülsenfrucht'] }),
  z('linsen_braun', 'Braune Linsen (gegart)', P, [116, 9, 20, 7.9, 1.8, 0.4, 0.05, 0.06, 0.2, 0, 2, 369, 40], { aox: 1, pre: 1, fod: true, al: ['linse', 'hülsenfrucht'] }),
  z('kidneybohnen', 'Kidneybohnen (Dose)', P, [120, 7.5, 20.5, 6.5, 1.5, 0.5, 0.1, 0.05, 0.2, 0, 250, 300, 100], { aox: 1, pre: 1, fod: true, al: ['bohne', 'bohnen', 'hülsenfrucht'] }),
  z('weisse_bohnen', 'Weiße Bohnen (Dose)', P, [114, 7.5, 19, 6, 0.5, 0.4, 0.1, 0.05, 0.2, 0, 240, 330, 100], { pre: 1, fod: true, al: ['bohne', 'bohnen', 'hülsenfrucht'] }),
  z('tofu', 'Tofu', P, [76, 8, 1.9, 0.3, 0.6, 4.8, 0.7, 1.1, 2.7, 0, 7, 121, 580], { a: ['soja'], al: ['soja'] }),
  z('raeuchertofu', 'Räuchertofu', P, [140, 15, 2, 1, 0.5, 8, 1.2, 1.8, 4.5, 0, 600, 150, 800], { a: ['soja'], al: ['soja', 'tofu'] }),
  z('edamame', 'Edamame', P, [121, 12, 9, 5.2, 2.2, 5.2, 0.6, 0.9, 2.4, 0, 6, 482, 280], { a: ['soja'], aox: 1, al: ['soja'] }),
  z('tempeh', 'Tempeh', P, [192, 20.3, 7.6, 5, 0, 10.8, 2.5, 2.4, 5.4, 0, 9, 412, 100], { a: ['soja'], pro: 0, fe: 50, aox: 1, al: ['soja', 'fermentiert'] }),
  z('sojadrink', 'Sojadrink (ungesüßt)', P, [33, 2.9, 1.7, 0.4, 0.6, 1.8, 0.2, 0.4, 1, 0, 12, 118, 100], { a: ['soja'], al: ['soja', 'pflanzenmilch'] }),
  z('miso', 'Miso-Paste', P, [199, 12, 26, 5.4, 6.2, 6, 1, 1.2, 2.9, 0, 3728, 210, 0], { a: ['soja'], pro: 10, fe: 8, al: ['soja'], u: ['EL', 'EL', 17, false] }),
  z('sojasauce', 'Sojasauce', P, [53, 8, 4.9, 0.8, 0.4, 0.6, 0.1, 0.1, 0.3, 0, 5493, 435, 0], { a: ['soja', 'gluten'], al: ['soja'], u: ['EL', 'EL', 15, false] }),

  // ── Nüsse, Samen, Öle ──────────────────────────────────────────────────
  z('mandeln', 'Mandeln', P, [579, 21, 22, 12.5, 4.4, 50, 3.8, 32, 12.3, 0, 1, 733, 3], { a: ['nuss'], aox: 1, al: ['nuss', 'nüsse'] }),
  z('walnuesse', 'Walnüsse', P, [654, 15, 14, 6.7, 2.6, 65, 6, 9, 47, 0, 2, 441, 9080], { a: ['nuss'], aox: 2, al: ['nuss', 'nüsse', 'walnuss'] }),
  z('cashews', 'Cashewkerne', P, [553, 18, 30, 3.3, 6, 44, 7.8, 24, 7.8, 0, 12, 660, 60], { a: ['nuss'], al: ['nuss', 'nüsse', 'cashew'] }),
  z('haselnuesse', 'Haselnüsse', P, [628, 15, 17, 10, 4.3, 61, 4.5, 46, 7.9, 0, 0, 680, 90], { a: ['nuss'], aox: 1, al: ['nuss', 'nüsse', 'haselnuss'] }),
  z('mandelmus', 'Mandelmus', P, [614, 21, 19, 10, 4, 55, 4, 35, 12, 0, 3, 700, 5], { a: ['nuss'], al: ['nuss', 'nüsse', 'mandel'], u: ['EL', 'EL', 15, false] }),
  z('erdnussmus', 'Erdnussmus', P, [588, 25, 20, 6, 9, 50, 10, 24, 15, 0, 17, 649, 10], { a: ['erdnuss'], al: ['erdnuss', 'erdnüsse'], u: ['EL', 'EL', 15, false] }),
  z('sonnenblumenkerne', 'Sonnenblumenkerne', P, [584, 20.8, 20, 8.6, 2.6, 51.5, 4.5, 18.5, 23.1, 0, 9, 645, 70], { aox: 1, al: ['kerne', 'samen'] }),
  z('kuerbiskerne', 'Kürbiskerne', P, [559, 30, 11, 6, 1.4, 49, 8.7, 16, 21, 0, 7, 809, 120], { aox: 1, al: ['kerne', 'samen'] }),
  z('chiasamen', 'Chiasamen', P, [486, 17, 42, 34, 0, 31, 3.3, 2.3, 23.7, 0, 16, 407, 17800], { aox: 2, pre: 1, al: ['samen'], u: ['EL', 'EL', 12, false] }),
  z('leinsamen', 'Leinsamen (geschrotet)', P, [534, 18, 29, 27, 1.6, 42, 3.7, 7.5, 28.7, 0, 30, 813, 22800], { aox: 1, pre: 1, al: ['samen', 'lein'], u: ['EL', 'EL', 10, false] }),
  z('sesam', 'Sesam', P, [573, 18, 23, 12, 0.3, 50, 7, 19, 22, 0, 11, 468, 370], { a: ['sesam'], al: ['samen'] }),
  z('tahini', 'Tahini', P, [595, 17, 21, 9, 0.5, 54, 7.5, 20, 23, 0, 115, 414, 400], { a: ['sesam'], al: ['sesam'], u: ['EL', 'EL', 15, false] }),
  z('olivenoel', 'Olivenöl', P, [884, 0, 0, 0, 0, 100, 13.8, 73, 10.5, 0, 2, 1, 760], { aox: 1, basis: true, u: ['EL', 'EL', 10, false], al: ['öl'] }),
  z('rapsoel', 'Rapsöl', P, [884, 0, 0, 0, 0, 100, 7.1, 63, 28, 0, 0, 0, 9100], { basis: true, u: ['EL', 'EL', 10, false], al: ['öl'] }),
  z('kokosoel', 'Kokosöl', P, [862, 0, 0, 0, 0, 100, 82.5, 6.3, 1.7, 0, 0, 0, 0], { basis: true, u: ['TL', 'TL', 5, false], al: ['öl', 'kokos'] }),
  z('kokosmilch', 'Kokosmilch', P, [197, 2, 2.8, 0, 2.8, 21, 18.6, 0.9, 0.2, 0, 13, 220, 0], { al: ['kokos'] }),

  // ── Eier, Milchprodukte ────────────────────────────────────────────────
  z('ei', 'Ei', 'eimilch', [143, 12.6, 0.7, 0, 0.4, 9.5, 3.1, 3.7, 1.4, 372, 142, 138, 100], { a: ['ei'], al: ['eier'], u: ['Ei', 'Eier', 55, true] }),
  z('joghurt', 'Naturjoghurt (3,5 %)', 'eimilch', [62, 3.5, 4.7, 0, 4.7, 3.3, 2.1, 0.9, 0.1, 13, 46, 155, 10], { a: ['milch'], lak: true, pro: 50, fe: 50, al: ['milch', 'joghurt', 'jogurt'] }),
  z('skyr', 'Skyr', 'eimilch', [63, 11, 4, 0, 4, 0.2, 0.1, 0.05, 0.02, 5, 40, 150, 0], { a: ['milch'], lak: true, pro: 50, fe: 50, al: ['milch', 'quark'] }),
  z('magerquark', 'Magerquark', 'eimilch', [67, 12, 4, 0, 4, 0.3, 0.2, 0.1, 0.01, 3, 41, 150, 0], { a: ['milch'], lak: true, al: ['milch', 'quark'] }),
  z('huettenkaese', 'Hüttenkäse', 'eimilch', [98, 11, 3.4, 0, 2.7, 4.3, 1.7, 0.8, 0.1, 17, 364, 104, 0], { a: ['milch'], lak: true, al: ['milch', 'käse', 'frischkäse'] }),
  z('frischkaese', 'Frischkäse (light)', 'eimilch', [110, 8, 4, 0, 4, 7, 4.5, 2, 0.2, 25, 330, 120, 0], { a: ['milch'], lak: true, al: ['milch', 'käse'] }),
  z('mozzarella', 'Mozzarella', 'eimilch', [250, 18, 1, 0, 1, 19, 12, 5.4, 0.6, 60, 400, 75, 0], { a: ['milch'], lak: true, al: ['milch', 'käse'] }),
  z('feta', 'Feta', 'eimilch', [264, 14.2, 4.1, 0, 4.1, 21.3, 14.9, 4.6, 0.6, 89, 917, 62, 0], { a: ['milch'], lak: true, al: ['milch', 'käse', 'schafskäse'] }),
  z('parmesan', 'Parmesan', 'eimilch', [392, 36, 0, 0, 0, 26, 17, 7.5, 0.8, 68, 1529, 100, 0], { a: ['milch'], al: ['milch', 'käse', 'hartkäse'] }),
  z('gouda', 'Gouda', 'eimilch', [356, 25, 2.2, 0, 2.2, 27.4, 17.6, 7.7, 0.7, 114, 819, 121, 0], { a: ['milch'], al: ['milch', 'käse', 'hartkäse'] }),
  z('milch', 'Milch (1,5 %)', 'eimilch', [47, 3.4, 4.8, 0, 4.8, 1.5, 1, 0.4, 0.05, 6, 43, 150, 5], { a: ['milch'], lak: true, al: ['kuhmilch'] }),
  z('kefir', 'Kefir', 'eimilch', [52, 3.5, 4.5, 0, 4.5, 2, 1.3, 0.5, 0.1, 10, 40, 150, 5], { a: ['milch'], lak: true, pro: 50, fe: 50, al: ['milch'] }),
  z('buttermilch', 'Buttermilch', 'eimilch', [37, 3.4, 4, 0, 4, 0.9, 0.6, 0.25, 0.03, 4, 105, 150, 0], { a: ['milch'], lak: true, pro: 50, fe: 50, al: ['milch'] }),
  z('sahne', 'Sahne', 'eimilch', [292, 2.4, 3, 0, 3, 30, 19, 8, 1, 109, 34, 100, 50], { a: ['milch'], lak: true, al: ['milch'] }),
  z('butter', 'Butter', 'eimilch', [717, 0.9, 0.1, 0, 0.1, 81, 51, 21, 3, 215, 11, 24, 300], { a: ['milch'], basis: true, al: ['milch'], u: ['TL', 'TL', 5, false] }),

  // ── Fleisch & Fisch ────────────────────────────────────────────────────
  z('haehnchenbrust', 'Hähnchenbrust', 'fleisch', [120, 22.5, 0, 0, 0, 2.6, 0.6, 0.8, 0.5, 73, 45, 370, 20], { al: ['hähnchen', 'huhn', 'geflügel', 'fleisch'] }),
  z('putenbrust', 'Putenbrust', 'fleisch', [114, 24, 0, 0, 0, 1.5, 0.4, 0.4, 0.4, 60, 60, 330, 20], { al: ['pute', 'geflügel', 'fleisch'] }),
  z('rinderhack', 'Rinderhack (mager)', 'fleisch', [150, 21, 0, 0, 0, 7, 3, 3.2, 0.3, 65, 70, 330, 30], { al: ['rind', 'hackfleisch', 'fleisch'] }),
  z('rinderfilet', 'Rinderfilet', 'fleisch', [143, 22, 0, 0, 0, 5.5, 2.2, 2.3, 0.3, 62, 55, 350, 30], { al: ['rind', 'steak', 'fleisch'] }),
  z('schweinefilet', 'Schweinefilet', 'fleisch', [120, 21, 0, 0, 0, 3.5, 1.2, 1.5, 0.5, 62, 55, 380, 20], { al: ['schwein', 'fleisch'] }),
  z('kochschinken', 'Kochschinken', 'fleisch', [110, 19, 0.5, 0, 0.5, 3.5, 1.2, 1.6, 0.4, 55, 1100, 300, 10], { al: ['schinken', 'fleisch', 'wurst'] }),
  z('lachs', 'Lachsfilet', 'fisch', [208, 20, 0, 0, 0, 13.4, 3.1, 3.8, 4.4, 55, 59, 363, 2260], { a: ['fisch'], al: ['fisch'] }),
  z('raeucherlachs', 'Räucherlachs', 'fisch', [190, 20, 0, 0, 0, 12, 2.5, 5, 3.5, 40, 1300, 300, 1800], { a: ['fisch'], al: ['fisch', 'lachs'] }),
  z('thunfisch', 'Thunfisch (Dose, im eigenen Saft)', 'fisch', [116, 26, 0, 0, 0, 0.8, 0.2, 0.1, 0.3, 30, 247, 237, 270], { a: ['fisch'], al: ['fisch'] }),
  z('forelle', 'Forellenfilet', 'fisch', [141, 20.5, 0, 0, 0, 6.2, 1.1, 1.9, 1.7, 58, 52, 481, 1000], { a: ['fisch'], al: ['fisch'] }),
  z('kabeljau', 'Kabeljau / Seelachs', 'fisch', [82, 18, 0, 0, 0, 0.7, 0.1, 0.1, 0.2, 43, 54, 413, 180], { a: ['fisch'], al: ['fisch', 'seelachs'] }),
  z('makrele', 'Makrelenfilet', 'fisch', [205, 18.6, 0, 0, 0, 13.9, 3.3, 5.4, 3.3, 70, 90, 314, 2670], { a: ['fisch'], al: ['fisch'] }),
  z('sardinen', 'Sardinen (Dose)', 'fisch', [208, 24.6, 0, 0, 0, 11.5, 1.5, 3.9, 5.1, 142, 505, 397, 1480], { a: ['fisch'], al: ['fisch'] }),
  z('garnelen', 'Garnelen', 'fisch', [99, 24, 0.2, 0, 0, 0.3, 0.1, 0.1, 0.1, 189, 111, 259, 300], { a: ['krebstiere'], al: ['meeresfrüchte', 'shrimps', 'krabben'] }),

  // ── Würzen, Süßes, Sonstiges ───────────────────────────────────────────
  z('honig', 'Honig', 'honig', [304, 0.3, 82.4, 0.2, 82.1, 0, 0, 0, 0, 0, 4, 52, 0], { u: ['TL', 'TL', 7, false] }),
  z('ahornsirup', 'Ahornsirup', P, [260, 0, 67, 0, 60, 0, 0, 0, 0, 0, 12, 212, 0], { basis: true, u: ['TL', 'TL', 7, false] }),
  z('kakao', 'Kakaopulver (ungesüßt)', P, [228, 19.6, 57.9, 33.2, 1.8, 13.7, 8, 4.6, 0.4, 0, 21, 1524, 0], { aox: 3, u: ['TL', 'TL', 5, false] }),
  z('kurkuma', 'Kurkuma', P, [312, 9.7, 67, 22.7, 3.2, 3.3, 1.8, 0.4, 0.6, 0, 27, 2080, 0], { aox: 3, basis: true, u: ['TL', 'TL', 3, false] }),
  z('zimt', 'Zimt', P, [247, 4, 81, 53, 2.2, 1.2, 0.3, 0.1, 0.1, 0, 10, 431, 0], { aox: 3, basis: true, u: ['TL', 'TL', 2.5, false] }),
  z('gewuerze', 'Gewürze', P, [280, 12, 50, 25, 5, 8, 1, 3, 2, 0, 100, 1500, 0], { aox: 2, basis: true, al: ['kreuzkümmel', 'paprikapulver', 'curry', 'pfeffer'], u: ['TL', 'TL', 3, false] }),
  z('salz', 'Salz', P, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38758, 8, 0], { basis: true, u: ['Prise', 'Prisen', 0.5, false] }),
  z('senf', 'Senf', P, [66, 4, 6, 3, 2.5, 4, 0.3, 2.6, 0.9, 0, 1100, 138, 0], { a: ['senf'], basis: true, u: ['TL', 'TL', 8, false] }),
  z('balsamico', 'Balsamico-Essig', P, [88, 0.5, 17, 0, 15, 0, 0, 0, 0, 0, 23, 112, 0], { basis: true, al: ['essig'], u: ['EL', 'EL', 15, false] }),
  z('gemuesebruehe', 'Gemüsebrühe', P, [4, 0.2, 0.7, 0, 0.3, 0.1, 0, 0, 0, 0, 250, 40, 0], { basis: true, al: ['brühe'] }),
  z('wasser', 'Wasser', P, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0], { basis: true }),
]

export const ZUTATEN: Record<string, Zutat> = Object.fromEntries(LISTE.map(x => [x.id, x]))
export const ZUTATEN_LISTE: Zutat[] = LISTE

export function zutat(id: string): Zutat | undefined {
  return ZUTATEN[id]
}

/** Flüssigkeiten werden in ml angegeben */
const FLUESSIG = new Set(['wasser', 'gemuesebruehe', 'milch', 'sojadrink', 'kokosmilch', 'kefir', 'sahne', 'zitronensaft', 'balsamico', 'sojasauce'])

function menge(n: number): string {
  const r = Math.round(n * 2) / 2
  const ganz = Math.floor(r)
  const halb = r - ganz === 0.5
  if (halb) return ganz === 0 ? '½' : `${ganz}½`
  return String(ganz)
}

/** „150 g Lachsfilet“, „2 Eier“, „1 EL Olivenöl“, „1 Prise Salz“ */
export function zutatZeile(z: Zutat, g: number): string {
  const e = z.einheit
  if (e) {
    const anzahl = g / e.g
    const gerundet = Math.round(anzahl * 2) / 2
    if (gerundet >= 0.5 && gerundet <= 12 && Math.abs(gerundet * e.g - g) / g <= 0.12) {
      const nenner = gerundet > 1 ? (e.p ?? e.n) : e.n
      if (e.stueck) return `${menge(gerundet)} ${nenner}`
      return `${menge(gerundet)} ${nenner} ${z.name}`
    }
  }
  const gram = g >= 10 ? Math.round(g / 5) * 5 : Math.round(g * 2) / 2
  return `${String(gram).replace('.', ',')} ${FLUESSIG.has(z.id) ? 'ml' : 'g'} ${z.name}`
}
