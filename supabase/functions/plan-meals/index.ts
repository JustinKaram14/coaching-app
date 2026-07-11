import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const {
    rezepte, goals, tage, mahlzeitenProTag, startDatum, wuensche,
    stores, budget, personen, haushalt,
  } = body

  interface HaushaltMitglied { name: string; kalorien: number; praeferenzen: string }
  interface HaushaltData { name: string; mitglieder: HaushaltMitglied[] }
  const haushaltData = haushalt && typeof haushalt === 'object' ? (haushalt as HaushaltData) : null

  const numTage = Number(tage) || 5
  const numMahlzeiten = Number(mahlzeitenProTag) || 3
  const numPersonen = haushaltData ? haushaltData.mitglieder.length : (Number(personen) || 1)
  const startStr = typeof startDatum === 'string' ? startDatum : new Date().toISOString().split('T')[0]
  const wuenscheStr = typeof wuensche === 'string' ? wuensche.trim() : ''
  const storesArr = Array.isArray(stores) ? (stores as string[]) : []
  const budgetVal = budget ? `ca. ${budget} €` : 'kein festes Budget'

  const goalsObj = (goals ?? {}) as Record<string, number | null>
  const kalorien = goalsObj.kalorien ?? 2000
  const protein = goalsObj.protein ?? null
  const karbs = goalsObj.karbs ?? null
  const fett = goalsObj.fett ?? null

  const rezepteArr = Array.isArray(rezepte) ? rezepte : []

  const dates: { datum: string; tag: string }[] = []
  for (let i = 0; i < numTage; i++) {
    const d = new Date(startStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    dates.push({ datum: d.toISOString().split('T')[0], tag: DOW[d.getDay()] })
  }

  const allSlots = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']
  const slots = allSlots.slice(0, Math.min(numMahlzeiten, 4))

  const rezepteJson = rezepteArr.length > 0
    ? JSON.stringify(rezepteArr.map((r: any) => ({
        id: r.id, name: r.name,
        kalorien_pro_portion: r.kalorien,
        protein_g: r.protein_g,
        kohlenhydrate_g: r.kohlenhydrate_g,
        fett_g: r.fett_g,
        portionen: r.portionen,
        zutaten: r.zutaten_text ?? null,
      })))
    : 'Keine Rezepte vorhanden — eigene Rezepte vorschlagen.'

  const storeText = storesArr.length > 0
    ? `Bevorzugte Einkaufsorte: ${storesArr.join(', ')}. Passe das Sortiment und typische Produkte dieser Märkte an.`
    : 'Keine Marktpräferenz angegeben.'

  let personenBlock: string
  let aufgabeBlock: string

  if (haushaltData) {
    const mitgliederText = haushaltData.mitglieder.map((m, i) =>
      `  Person ${i + 1}: ${m.name}\n    - Kalorienziel: ~${m.kalorien} kcal/Tag\n    - Präferenzen/Besonderheiten: ${m.praeferenzen || 'keine'}`
    ).join('\n')

    personenBlock = `HAUSHALT: "${haushaltData.name}" — ${numPersonen} Personen mit INDIVIDUELLEN Präferenzen:
${mitgliederText}
- Wöchentliches Budget (gesamt): ${budgetVal}
- ${storeText}
- Besondere Wünsche (allgemein): ${wuenscheStr || 'keine'}`

    aufgabeBlock = `AUFGABE (Haushalt-Modus):
1. Erstelle einen ausgewogenen ${numTage}-Tage Plan für beide Personen
2. GETEILTE MAHLZEITEN: Falls eine Mahlzeit für beide passt → einen Eintrag ohne Namens-Suffix
3. PERSONENSPEZIFISCHE MAHLZEITEN: Falls die Präferenzen stark abweichen → separate Einträge mit Name in Klammern im Rezeptnamen, z.B. "Hähnchen-Bowl (${haushaltData.mitglieder[0]?.name ?? 'Person 1'})" und "Lachsnudeln (${haushaltData.mitglieder[1]?.name ?? 'Person 2'})"
4. Jede Person soll ihr Kalorienziel pro Tag möglichst genau treffen
5. Die Präferenzen und Besonderheiten jeder Person MÜSSEN berücksichtigt werden
6. Einkaufsliste: ALLE Zutaten für alle Rezepte aggregieren (geteilte + personenspezifische), nach Supermarkt-Kategorien sortieren, Mengen für alle ${numTage} Tage
7. Kochanleitung: Schrittweise, konkret, mit Zeit-Angaben — wo nötig Variationen für beide Personen beschreiben. Format: Abschnitte (## Titel) mit nummerierten Schritten`
  } else {
    const zielText = [
      `Kalorien: ~${kalorien * numPersonen} kcal/Tag gesamt (${kalorien} kcal × ${numPersonen} Person${numPersonen > 1 ? 'en' : ''})`,
      protein ? `Protein: ~${protein * numPersonen}g/Tag` : null,
      karbs ? `Kohlenhydrate: ~${karbs * numPersonen}g/Tag` : null,
      fett ? `Fett: ~${fett * numPersonen}g/Tag` : null,
    ].filter(Boolean).join('\n')

    personenBlock = `EINSTELLUNGEN:
- Personen: ${numPersonen}
- Dauer: ${numTage} Tage ab ${startStr}
- Mahlzeiten pro Tag: ${numMahlzeiten} (${slots.join(', ')})
- Nährstoffziele (pro Person):
  ${zielText}
- Wöchentliches Budget: ${budgetVal}
- ${storeText}
- Besondere Wünsche: ${wuenscheStr || 'keine'}`

    aufgabeBlock = `AUFGABE:
1. Erstelle einen ausgewogenen ${numTage}-Tage Plan für ${numPersonen} Person${numPersonen > 1 ? 'en' : ''}
2. Portionen für die korrekte Personenanzahl skalieren
3. Jeden Tag möglichst nah an ${kalorien * numPersonen} kcal halten
4. Einkaufsliste: ALLE Zutaten für alle Rezepte des Plans aggregieren und nach Supermarkt-Kategorien sortieren
5. Mengenangaben für ${numPersonen} Person${numPersonen > 1 ? 'en' : ''} und alle ${numTage} Tage berechnen
6. Kochanleitung: Schrittweise, konkret, mit Zeit-Angaben. Format: Abschnitte (## Titel) mit nummerierten Schritten`
  }

  const prompt = `Du bist ein Ernährungsexperte und Meal Prep Coach. Erstelle einen vollständigen Meal Prep Plan mit Einkaufsliste und detaillierter Kochanleitung.

${personenBlock}

VERFÜGBARE REZEPTE (bevorzugt nutzen, exakte Namen + IDs übernehmen):
${rezepteJson}

${aufgabeBlock}

Antworte NUR mit diesem JSON (kein Text davor/dahinter, kein Markdown-Block):
{
  "tage": [
    {
      "datum": "YYYY-MM-DD",
      "tag": "Montag",
      "mahlzeiten": [
        {
          "mahlzeit": "Frühstück",
          "rezept_name": "Name",
          "rezept_id": "uuid-oder-null",
          "portionen": 1.0,
          "kalorien": 400,
          "protein_g": 30,
          "kohlenhydrate_g": 40,
          "fett_g": 10
        }
      ],
      "gesamt_kalorien": 2000
    }
  ],
  "einkaufsliste": {
    "kategorien": [
      {
        "name": "Gemüse & Obst",
        "emoji": "🥬",
        "artikel": [
          {"menge": "500g", "name": "Brokkoli"},
          {"menge": "4 Stück", "name": "Bananen"}
        ]
      },
      {
        "name": "Fleisch & Fisch",
        "emoji": "🥩",
        "artikel": [{"menge": "800g", "name": "Hähnchenbrust"}]
      },
      {
        "name": "Milch & Milchprodukte",
        "emoji": "🥛",
        "artikel": []
      },
      {
        "name": "Eier",
        "emoji": "🥚",
        "artikel": []
      },
      {
        "name": "Nudeln, Reis & Getreide",
        "emoji": "🌾",
        "artikel": []
      },
      {
        "name": "Brot & Backwaren",
        "emoji": "🍞",
        "artikel": []
      },
      {
        "name": "Konserven & Soßen",
        "emoji": "🥫",
        "artikel": []
      },
      {
        "name": "Gewürze & Öle",
        "emoji": "🧂",
        "artikel": []
      },
      {
        "name": "Tiefkühlprodukte",
        "emoji": "❄️",
        "artikel": []
      },
      {
        "name": "Drogerie",
        "emoji": "🧴",
        "artikel": []
      }
    ],
    "budget_gesamt_ca": "48.00",
    "hinweis": "Preise basieren auf typischen ${storesArr.length > 0 ? storesArr.join('/') : 'Supermarkt'}-Preisen. Aktuelle Angebote können abweichen."
  },
  "meal_prep_guide": "## Vorbereitung (X Min.)\\n1. Schritt...\\n\\n## Kochen (X Min.)\\n2. Schritt..."
}`

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
        generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
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
