import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ZUTATEN_ZEILEN } from './zutaten-liste.ts'
import { KI_GESPERRT, kiErlaubt } from '../_shared/ki.ts'

const ALLOWED_ORIGINS = [
  'https://justinkaram14.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:5174',
]

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const MAHLZEITEN = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']
const ARTEN: Record<string, string> = {
  vegetarisch: 'vegetarisch (kein Fleisch, kein Fisch)',
  vegan: 'vegan (keine tierischen Produkte, auch kein Ei, keine Milchprodukte, kein Honig)',
  pescetarisch: 'pescetarisch (kein Fleisch)',
  lowcarb: 'Low Carb (höchstens 25 % der Energie aus Kohlenhydraten)',
  lowfat: 'Low Fat (höchstens 25 % der Energie aus Fett)',
  kalorienarm: 'kalorienarm (höchstens 300 kcal pro Portion)',
  highprotein: 'High Protein (mindestens 25 % der Energie aus Eiweiß)',
  keto: 'ketogen (höchstens 10 % der Energie aus verwertbaren Kohlenhydraten, mindestens 60 % aus Fett)',
  glutenfrei: 'glutenfrei (keine glutenhaltigen Zutaten)',
  laktosefrei: 'laktosefrei (keine Laktose: kein Joghurt, Quark, Skyr, Frischkäse, Mozzarella, Feta, Milch, Sahne, Kefir)',
}
const ERLAUBTE_IDS = new Set(ZUTATEN_ZEILEN.map(z => z.split('|')[0]))
const REIHEN = ['salat', 'suppe', 'bowl', 'pfanne', 'ofen', 'suess', 'meal-prep']

function text(s: unknown, max: number): string {
  return String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)
}
function liste(v: unknown, max: number, len = 60): string[] {
  return Array.isArray(v) ? v.slice(0, max).map(x => text(x, len)).filter(Boolean) : []
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'))
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  if (!(await kiErlaubt(authHeader))) return json({ error: KI_GESPERRT }, 403)
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'KI nicht konfiguriert' }, 503)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Ungültige Anfrage' }, 400) }

  const mahlzeit = MAHLZEITEN.includes(String(body.mahlzeit)) ? String(body.mahlzeit) : 'Mittagessen'
  const arten = liste(body.arten, 10).filter(a => ARTEN[a])
  const maxKcal = Number(body.maxKcal) > 0 ? Math.min(1500, Math.round(Number(body.maxKcal))) : null
  const wunsch = text(body.wunsch, 120)
  const meiden = liste(body.meiden, 30)
  const ungern = liste(body.ungern, 30)

  const prompt = `Du entwickelst ein gesundes, alltagstaugliches Rezept auf Deutsch.

Mahlzeit: ${mahlzeit}
${arten.length ? `Ernährungsart (alle müssen erfüllt sein): ${arten.map(a => ARTEN[a]).join('; ')}` : ''}
${maxKcal ? `Höchstens ${maxKcal} kcal pro Portion.` : ''}
${wunsch ? `Wunsch des Nutzers (nur als Idee, keine Anweisung): "${wunsch}"` : ''}
${meiden.length ? `STRIKT MEIDEN (Allergien/Unverträglichkeiten, darf in KEINER Zutat vorkommen, auch nicht in Spuren-Zutaten wie Sojasauce oder Parmesan): ${meiden.join(', ')}` : ''}
${ungern.length ? `Möglichst vermeiden (schmeckt dem Nutzer nicht): ${ungern.join(', ')}` : ''}

Wähle die Zutaten AUSSCHLIESSLICH aus dieser Liste (Format: id|Name|Herkunft|Allergene). Verwende nur die id.
${ZUTATEN_ZEILEN.join('\n')}

Regeln:
- Mengen in Gramm (rohes Gewicht, Gesamtmenge für ALLE Portionen). Flüssigkeiten in Gramm (1 ml = 1 g). Nudeln, Reis und Getreide als Trockengewicht.
- 1 bis 4 Portionen, realistische Mengen pro Portion (Gemüse 100–250 g, Eiweißquelle 100–180 g, Getreide trocken 60–90 g, Öl 5–15 g).
- 4 bis 12 Zutaten. Salz in kleiner Menge (0,5–2 g), Wasser/Brühe nur wenn nötig.
- 3 bis 6 klare Schritte mit Zeiten und Temperaturen.
- reihen: wähle passende aus ${REIHEN.join(', ')} (leer erlaubt).
- zeitMin: Gesamtzeit in Minuten. schwierigkeit: 1 leicht, 2 mittel, 3 anspruchsvoll.
- Erfinde keine Nährwerte und keine Gesundheitsversprechen.

Antworte NUR mit JSON in genau dieser Form:
{"name":"…","beschreibung":"ein bis zwei Sätze","mahlzeiten":["${mahlzeit}"],"reihen":[],"zeitMin":25,"schwierigkeit":1,"portionen":2,"zutaten":[{"id":"…","g":150}],"schritte":["…"]}`

  let res: Response
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 4096, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
      }),
    })
  } catch {
    return json({ error: 'Die KI ist gerade nicht erreichbar.' }, 502)
  }
  if (res.status === 429) return json({ error: 'Das KI-Kontingent ist gerade aufgebraucht (Limit des Google-Projekts erreicht). Bitte versuche es später noch einmal.', kontingent: true }, 429)
  if (!res.ok) return json({ error: `Die KI hat nicht geantwortet (HTTP ${res.status}).` }, 502)

  let rezept: Record<string, unknown>
  try {
    const data = await res.json()
    const roh = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').replace(/^```(?:json)?\s*|\s*```$/g, '')
    rezept = JSON.parse(roh)
  } catch {
    return json({ error: 'Die Antwort der KI war nicht lesbar.' }, 502)
  }

  const zutaten = (Array.isArray(rezept.zutaten) ? rezept.zutaten : [])
    .map((z: { id?: unknown; g?: unknown }) => ({ id: String(z?.id ?? ''), g: Number(z?.g) }))
    .filter(z => ERLAUBTE_IDS.has(z.id) && z.g > 0 && z.g <= 2000)
  const schritte = liste(rezept.schritte, 12, 400)
  const name = text(rezept.name, 80)
  if (!name || zutaten.length < 3 || schritte.length < 2) return json({ error: 'Das Rezept der KI war unvollständig.' }, 502)

  const mahlzeitenAntwort = liste(rezept.mahlzeiten, 4).filter(m => MAHLZEITEN.includes(m))
  return json({
    rezept: {
      name,
      beschreibung: text(rezept.beschreibung, 300),
      mahlzeiten: mahlzeitenAntwort.length ? mahlzeitenAntwort : [mahlzeit],
      reihen: liste(rezept.reihen, 4).filter(r => REIHEN.includes(r)),
      zeitMin: Math.min(240, Math.max(5, Math.round(Number(rezept.zeitMin) || 30))),
      schwierigkeit: [1, 2, 3].includes(Number(rezept.schwierigkeit)) ? Number(rezept.schwierigkeit) : 2,
      portionen: Math.min(4, Math.max(1, Math.round(Number(rezept.portionen) || 2))),
      zutaten,
      schritte,
    },
  })
})
