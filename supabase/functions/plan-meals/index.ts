import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://justinkaram14.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

async function pickFlashModel(apiKey: string): Promise<string> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`)
    if (!res.ok) return 'gemini-2.5-flash'
    const { models = [] } = await res.json()
    const candidates = (models as { name: string; supportedGenerationMethods?: string[] }[])
      .filter(m =>
        m.name.toLowerCase().includes('flash') &&
        !m.name.includes('tts') &&
        !m.name.includes('thinking') &&
        (m.supportedGenerationMethods ?? []).includes('generateContent')
      )
      .sort((a, b) => {
        const aStable = a.name.includes('preview') ? 0 : 1
        const bStable = b.name.includes('preview') ? 0 : 1
        if (aStable !== bStable) return bStable - aStable
        return b.name.localeCompare(a.name)
      })
    if (candidates.length > 0) return candidates[0].name.replace('models/', '')
  } catch { /* fall through */ }
  return 'gemini-2.5-flash'
}

const DOW: Record<number, string> = {
  0: 'Sonntag', 1: 'Montag', 2: 'Dienstag', 3: 'Mittwoch',
  4: 'Donnerstag', 5: 'Freitag', 6: 'Samstag',
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse body
  let body: {
    rezepte?: unknown
    goals?: unknown
    tage?: unknown
    mahlzeitenProTag?: unknown
    startDatum?: unknown
    wuensche?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { rezepte, goals, tage, mahlzeitenProTag, startDatum, wuensche } = body

  const numTage = Number(tage) || 5
  const numMahlzeiten = Number(mahlzeitenProTag) || 3
  const startStr = typeof startDatum === 'string' ? startDatum : new Date().toISOString().split('T')[0]
  const wuenscheStr = typeof wuensche === 'string' ? wuensche.trim() : ''

  const goalsObj = (goals ?? {}) as Record<string, number | null>
  const kalorien = goalsObj.kalorien ?? 2000
  const protein = goalsObj.protein ?? null
  const karbs = goalsObj.karbs ?? null
  const fett = goalsObj.fett ?? null

  const rezepteArr = Array.isArray(rezepte) ? rezepte : []

  // Build date list
  const dates: { datum: string; tag: string }[] = []
  for (let i = 0; i < numTage; i++) {
    const d = new Date(startStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    dates.push({ datum: d.toISOString().split('T')[0], tag: DOW[d.getDay()] })
  }

  // Select meal slots based on count
  const allSlots = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']
  const slots = allSlots.slice(0, Math.min(numMahlzeiten, 4))

  const rezepteJson = rezepteArr.length > 0
    ? JSON.stringify(rezepteArr.map((r: any) => ({
        id: r.id,
        name: r.name,
        kalorien_pro_portion: r.kalorien,
        protein_g: r.protein_g,
        kohlenhydrate_g: r.kohlenhydrate_g,
        fett_g: r.fett_g,
        portionen: r.portionen,
      })))
    : 'Keine Rezepte vorhanden - bitte eigene Rezepte vorschlagen.'

  const zielText = [
    `- Kalorien: ~${kalorien} kcal/Tag`,
    protein ? `- Protein: ~${protein}g/Tag` : null,
    karbs ? `- Kohlenhydrate: ~${karbs}g/Tag` : null,
    fett ? `- Fett: ~${fett}g/Tag` : null,
  ].filter(Boolean).join('\n')

  const prompt = `Du bist ein Ernährungsexperte und Meal Prep Coach. Erstelle einen optimalen Meal Plan.

EINSTELLUNGEN:
- Dauer: ${numTage} Tage (ab ${startStr})
- Mahlzeiten pro Tag: ${numMahlzeiten} (${slots.join(', ')})
- Nährstoffziele:
${zielText}
- Besondere Wünsche: ${wuenscheStr || 'keine'}

VERFÜGBARE REZEPTE (bevorzugt einsetzen, exakte IDs und Namen übernehmen):
${rezepteJson}

AUFGABE:
1. Erstelle einen ausgewogenen ${numTage}-Tage Plan
2. Nutze vorhandene Rezepte mit exakten Namen und IDs; neue Rezepte erhalten rezept_id: null
3. Passe Portionen so an, dass jeder Tag ~${kalorien} kcal erreicht
4. Schreibe eine konkrete Meal Prep Anleitung auf Deutsch (was am Prep-Tag vorbereiten)

Antworte NUR mit diesem JSON (kein Text davor/dahinter, kein Markdown):
{
  "tage": [${dates.map(d =>
    `{"datum":"${d.datum}","tag":"${d.tag}","mahlzeiten":[...],"gesamt_kalorien":0}`
  ).join(',')}],
  "meal_prep_guide": "..."
}

Jede Mahlzeit hat diese Felder:
{"mahlzeit":"${slots[0]}","rezept_name":"Name","rezept_id":"uuid-oder-null","portionen":1.0,"kalorien":400,"protein_g":30,"kohlenhydrate_g":40,"fett_g":10}`

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'KI-Service nicht konfiguriert' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const model = await pickFlashModel(apiKey)

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Gemini error:', response.status, errBody)
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'KI-Anfrage fehlgeschlagen.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'KI hat kein gültiges JSON zurückgegeben.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const plan = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
