// Produktdaten für den Produkt-Check: live von Open Food Facts, ohne Netz aus der eigenen Lebensmittel-Datenbank.

import { supabase } from '../supabase'
import type { AnamneseProfil } from '../entdecken/filter'
import { bewerte, type Produkt } from './bewertung'

const OFF_FELDER = [
  'product_name_de', 'product_name', 'brands', 'image_front_small_url', 'image_front_url', 'quantity', 'nutriments',
  'additives_tags', 'labels_tags', 'categories_tags', 'allergens_tags', 'traces_tags', 'ingredients_analysis_tags',
  'ingredients_text_de', 'ingredients_text',
].join(',')

interface OffProdukt {
  product_name_de?: string; product_name?: string; brands?: string; image_front_small_url?: string; image_front_url?: string
  quantity?: string; nutriments?: Record<string, number | string | undefined>; additives_tags?: string[]; labels_tags?: string[]
  categories_tags?: string[]; allergens_tags?: string[]; traces_tags?: string[]; ingredients_analysis_tags?: string[]
  ingredients_text_de?: string; ingredients_text?: string
}

export interface LebensmittelZeile {
  barcode: string | null; name: string; marke: string | null; bild: string | null; menge: string | null
  kcal: number; zucker: number | null; gesaettigt: number | null; salz: number | null; ballast: number | null
  protein: number | null; obst_gemuese: number | null; ml: boolean; bio: boolean | null; zusatzstoffe: string[] | null
  kategorien: string[] | null
}

const zahl = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v !== '' && !isNaN(+v) ? +v : undefined)
const BIO = ['en:organic', 'en:eu-organic', 'de:bio', 'fr:ab-agriculture-biologique']

function ausOff(barcode: string, o: OffProdukt): Produkt {
  const n = o.nutriments ?? {}
  const kategorien = o.categories_tags ?? []
  const zucker = zahl(n.sugars_100g)
  const menge = o.quantity?.trim() || undefined
  return {
    barcode,
    name: (o.product_name_de || o.product_name || 'Unbekanntes Produkt').trim(),
    marke: o.brands?.split(',')[0]?.trim() || undefined,
    bild: o.image_front_url || o.image_front_small_url,
    menge,
    kcal: zahl(n['energy-kcal_100g']) ?? (zahl(n.energy_100g) != null ? zahl(n.energy_100g)! / 4.184 : undefined),
    zucker,
    gesaettigt: zahl(n['saturated-fat_100g']),
    salz: zahl(n.salt_100g),
    ballast: zahl(n.fiber_100g),
    protein: zahl(n.proteins_100g),
    obstGemuese: zahl(n['fruits-vegetables-legumes-estimate-from-ingredients_100g']) ?? zahl(n['fruits-vegetables-nuts-estimate-from-ingredients_100g']) ?? zahl(n['fruits-vegetables-nuts_100g']),
    getraenk: kategorien.includes('en:beverages') && !kategorien.includes('en:dairies'),
    wasser: kategorien.includes('en:waters') && !(zucker ?? 0),
    bio: (o.labels_tags ?? []).some(l => BIO.includes(l)),
    zusatzstoffe: o.additives_tags ?? [],
    allergene: o.allergens_tags ?? [],
    spuren: o.traces_tags ?? [],
    analyse: o.ingredients_analysis_tags ?? [],
    kategorien,
    zutaten: (o.ingredients_text_de || o.ingredients_text || '').trim() || undefined,
  }
}

export function ausDatenbank(l: LebensmittelZeile): Produkt {
  const kategorien = l.kategorien ?? []
  return {
    barcode: l.barcode ?? '',
    name: l.name,
    marke: l.marke ?? undefined,
    bild: l.bild ?? undefined,
    menge: l.menge ?? undefined,
    kcal: l.kcal,
    zucker: l.zucker ?? undefined,
    gesaettigt: l.gesaettigt ?? undefined,
    salz: l.salz ?? undefined,
    ballast: l.ballast ?? undefined,
    protein: l.protein ?? undefined,
    obstGemuese: l.obst_gemuese ?? undefined,
    getraenk: l.ml || kategorien.includes('en:beverages'),
    wasser: kategorien.includes('en:waters') && !(l.zucker ?? 0),
    bio: !!l.bio,
    zusatzstoffe: l.zusatzstoffe ?? [],
    allergene: [],
    spuren: [],
    analyse: [],
    kategorien,
  }
}

const DB_FELDER = 'barcode,name,marke,bild,menge,kcal,zucker,gesaettigt,salz,ballast,protein,obst_gemuese,ml,bio,zusatzstoffe,kategorien'

/** Lädt ein Produkt per Barcode. `offline` heißt: nur aus der eigenen Datenbank (ohne Allergene und Zutaten). */
export async function ladeProdukt(barcode: string): Promise<{ produkt: Produkt; offline: boolean } | null> {
  const [live, eigen] = await Promise.all([
    fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${OFF_FELDER}`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null) as Promise<{ status?: number; product?: OffProdukt } | null>,
    supabase.from('lebensmittel').select(DB_FELDER).eq('barcode', barcode).limit(1).maybeSingle().then(r => r.data as LebensmittelZeile | null),
  ])
  if (live?.product && (live.product.nutriments?.['energy-kcal_100g'] != null || !eigen)) {
    return { produkt: ausOff(barcode, live.product), offline: false }
  }
  if (eigen) return { produkt: ausDatenbank(eigen), offline: !live?.product }
  return null
}

export interface Alternative { produkt: Produkt; punkte: number }

/** Bis zu 5 bekannte Produkte derselben Kategorie mit deutlich besserer Bewertung; genauere Kategorie zuerst */
export async function ladeAlternativen(p: Produkt, punkte: number | null): Promise<Alternative[]> {
  const ergebnis: Alternative[] = []
  for (const kategorie of [p.kategorien.at(-1), p.kategorien.at(-2)].filter((k): k is string => !!k)) {
    const { data } = await supabase.from('lebensmittel').select(DB_FELDER).contains('kategorien', [kategorie])
      .neq('barcode', p.barcode).order('beliebtheit', { ascending: false }).limit(60)
    const besser = ((data ?? []) as LebensmittelZeile[])
      .map(ausDatenbank)
      .map(produkt => ({ produkt, punkte: bewerte(produkt).punkte }))
      .filter((a): a is Alternative => a.punkte != null && a.punkte >= (punkte ?? 0) + 5 && !ergebnis.some(e => e.produkt.barcode === a.produkt.barcode))
      .sort((a, b) => b.punkte - a.punkte)
    ergebnis.push(...besser.slice(0, 5 - ergebnis.length))
    if (ergebnis.length >= 3) break
  }
  return ergebnis
}

// ─── Warnungen: Anamnese (Allergien/Unverträglichkeiten) und eigene Präferenzen ──

export interface Praeferenzen { vegan?: boolean; vegetarisch?: boolean; ohnePalmoel?: boolean }

export interface Warnung { label: string; art: 'enthaelt' | 'spuren' | 'unklar' }

const ALLERGEN_TAGS: Record<string, string[]> = {
  milch: ['en:milk'], laktose: ['en:milk'], gluten: ['en:gluten'], erdnuss: ['en:peanuts'], nuss: ['en:nuts'],
  ei: ['en:eggs'], soja: ['en:soybeans'], fisch: ['en:fish'], krebstiere: ['en:crustaceans', 'en:molluscs'],
  sesam: ['en:sesame-seeds'], sellerie: ['en:celery'], senf: ['en:mustard'],
}

export function warnungen(p: Produkt, profil: AnamneseProfil | null, praef: Praeferenzen): Warnung[] {
  const liste: Warnung[] = []
  for (const { label, regelId } of profil?.harte ?? []) {
    const tags = ALLERGEN_TAGS[regelId] ?? []
    if (p.allergene.some(a => tags.includes(a))) liste.push({ label: `Enthält ${label}`, art: 'enthaelt' })
    else if (p.spuren.some(a => tags.includes(a))) liste.push({ label: `Kann Spuren von ${label} enthalten`, art: 'spuren' })
  }
  if (praef.vegan && p.analyse.includes('en:non-vegan')) liste.push({ label: 'Nicht vegan', art: 'enthaelt' })
  else if (praef.vegan && p.analyse.includes('en:vegan-status-unknown')) liste.push({ label: 'Vegan unklar', art: 'unklar' })
  if (praef.vegetarisch && p.analyse.includes('en:non-vegetarian')) liste.push({ label: 'Nicht vegetarisch', art: 'enthaelt' })
  if (praef.ohnePalmoel && p.analyse.includes('en:palm-oil')) liste.push({ label: 'Enthält Palmöl', art: 'enthaelt' })
  else if (praef.ohnePalmoel && p.analyse.includes('en:may-contain-palm-oil')) liste.push({ label: 'Kann Palmöl enthalten', art: 'unklar' })
  return liste
}

// ─── Verlauf und Favoriten ───────────────────────────────────────────────────

export interface Scan { barcode: string; name: string; marke: string | null; bild: string | null; punkte: number | null; favorit: boolean; gescannt_am: string }

export async function scanSpeichern(userId: string, p: Produkt, punkte: number | null) {
  await supabase.from('produkt_scans').upsert({
    user_id: userId, barcode: p.barcode, name: p.name.slice(0, 200), marke: p.marke?.slice(0, 100) ?? null,
    bild: p.bild?.slice(0, 300) ?? null, punkte, gescannt_am: new Date().toISOString(),
  }, { onConflict: 'user_id,barcode' })
}
