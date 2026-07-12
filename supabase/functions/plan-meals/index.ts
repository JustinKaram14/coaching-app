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

async function pickFlashModel(apiKey: string): Promise<{ name: string; outputTokenLimit: number }> {
  const fallback = { name: 'gemini-2.5-flash', outputTokenLimit: 8192 }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`)
    if (!res.ok) return fallback
    const { models = [] } = await res.json()
    const candidates = (models as { name: string; supportedGenerationMethods?: string[]; outputTokenLimit?: number }[])
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
    if (candidates.length > 0) {
      const best = candidates[0]
      return { name: best.name.replace('models/', ''), outputTokenLimit: best.outputTokenLimit ?? fallback.outputTokenLimit }
    }
  } catch { /* fall through */ }
  return fallback
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
    rezepte, goals, tage, mahlzeiten, startDatum, wuensche,
    budget, personen, haushalt,
  } = body

  interface HaushaltMitglied { name: string; kalorien: number; praeferenzen: string }
  interface HaushaltData { name: string; mitglieder: HaushaltMitglied[] }
  const haushaltData = haushalt && typeof haushalt === 'object' ? (haushalt as HaushaltData) : null

  const numTage = Number(tage) || 5
  const numPersonen = haushaltData ? haushaltData.mitglieder.length : (Number(personen) || 1)
  const startStr = typeof startDatum === 'string' ? startDatum : new Date().toISOString().split('T')[0]
  const wuenscheStr = typeof wuensche === 'string' ? wuensche.trim() : ''
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
  const requestedMeals = Array.isArray(mahlzeiten) ? (mahlzeiten as string[]).filter(m => allSlots.includes(m)) : []
  const slots = requestedMeals.length > 0 ? allSlots.filter(s => requestedMeals.includes(s)) : allSlots.slice(0, 3)

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

  let personenBlock: string
  let aufgabeBlock: string

  if (haushaltData) {
    const mitgliederText = haushaltData.mitglieder.map((m, i) =>
      `  Person ${i + 1}: ${m.name}\n    - Kalorienziel: ~${m.kalorien} kcal/Tag\n    - Präferenzen/Besonderheiten: ${m.praeferenzen || 'keine'}`
    ).join('\n')

    personenBlock = `HAUSHALT: "${haushaltData.name}" — ${numPersonen} Personen mit INDIVIDUELLEN Präferenzen:
${mitgliederText}
- Mahlzeiten: NUR diese — ${slots.join(', ')}. KEINE anderen Mahlzeiten einplanen, auch wenn sie üblich wären.
- Wöchentliches Budget (gesamt): ${budgetVal}
- Besondere Wünsche (allgemein): ${wuenscheStr || 'keine'}`

    aufgabeBlock = `AUFGABE (Haushalt-Modus):
1. Erstelle einen ausgewogenen ${numTage}-Tage Plan für beide Personen, NUR mit den Mahlzeiten ${slots.join(', ')}
2. GETEILTE MAHLZEITEN: Falls eine Mahlzeit für beide passt → einen Eintrag ohne Namens-Suffix
3. PERSONENSPEZIFISCHE MAHLZEITEN: Falls die Präferenzen stark abweichen → separate Einträge mit Name in Klammern im Rezeptnamen, z.B. "Hähnchen-Bowl (${haushaltData.mitglieder[0]?.name ?? 'Person 1'})" und "Lachsnudeln (${haushaltData.mitglieder[1]?.name ?? 'Person 2'})"
4. Jede Person soll ihr Kalorienziel pro Tag möglichst genau treffen
5. Die Präferenzen und Besonderheiten jeder Person MÜSSEN berücksichtigt werden
6. Einkaufsliste: ALLE Zutaten für alle Rezepte aggregieren (geteilte + personenspezifische), nach Supermarkt-Kategorien sortieren, Mengen für alle ${numTage} Tage
7. Kochanleitung: siehe Vorgaben zu "meal_prep_guide" unten — wo nötig Variationen für beide Personen beschreiben`
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
- Mahlzeiten: NUR diese — ${slots.join(', ')}. KEINE anderen Mahlzeiten einplanen, auch wenn sie üblich wären.
- Nährstoffziele (pro Person):
  ${zielText}
- Wöchentliches Budget: ${budgetVal}
- Besondere Wünsche: ${wuenscheStr || 'keine'}`

    aufgabeBlock = `AUFGABE:
1. Erstelle einen ausgewogenen ${numTage}-Tage Plan für ${numPersonen} Person${numPersonen > 1 ? 'en' : ''}, NUR mit den Mahlzeiten ${slots.join(', ')}
2. Portionen für die korrekte Personenanzahl skalieren
3. Jeden Tag möglichst nah an ${kalorien * numPersonen} kcal halten
4. Einkaufsliste: ALLE Zutaten für alle Rezepte des Plans aggregieren und nach Supermarkt-Kategorien sortieren
5. Mengenangaben für ${numPersonen} Person${numPersonen > 1 ? 'en' : ''} und alle ${numTage} Tage berechnen
6. Kochanleitung: siehe Vorgaben zu "meal_prep_guide" unten`
  }

  const prompt = `Du bist ein Ernährungsexperte und Meal Prep Coach. Erstelle einen vollständigen Meal Prep Plan mit Einkaufsliste und detaillierter Kochanleitung.

${personenBlock}

VERFÜGBARE REZEPTE (bevorzugt nutzen, exakte Namen + IDs übernehmen):
${rezepteJson}

${aufgabeBlock}

WICHTIG zur Vollständigkeit:
- Das "tage"-Array MUSS exakt ${numTage} Objekte enthalten — einen Eintrag für JEDEN Tag von ${dates[0]?.datum} bis ${dates[numTage - 1]?.datum}. Überspringe keinen einzigen Tag, auch nicht bei vielen Tagen.
- Zähle am Ende nach, bevor du antwortest: Anzahl der Objekte im tage-Array muss ${numTage} sein.
- Halte Rezeptnamen kurz und die Einkaufsliste kompakt (nur Menge + Name, keine Sätze) — aber spare NICHT an der Kochanleitung, siehe unten.

WICHTIG zur Kochanleitung (meal_prep_guide) — muss so präzise sein, dass jemand ohne Kocherfahrung sie 1:1 nachkochen kann:
- Für JEDES unterschiedliche Rezept im Plan ein eigener "## Rezeptname"-Abschnitt (keine generischen "Vorbereitung"/"Kochen"-Überschriften ohne Rezeptbezug).
- Jeder Schritt braucht: exakte Mengenangaben (g/ml/Stück), exakte Zeiten (Minuten), exakte Temperaturen (°C, Ober-/Unterhitze oder Umluft), Schnittgröße/-technik bei Zutaten, Pfannen-/Topfgröße wo relevant, und ein konkretes Gar-Kriterium (z.B. "bis Kerntemperatur 75°C", "bis goldbraun", "bis die Nudeln bissfest sind").
- Reihenfolge der Schritte muss zeitlich sinnvoll sein (was parallel geht, was zuerst).
- Am Ende jedes Rezept-Abschnitts: Aufbewahrung (wie viele Tage im Kühlschrank) und Aufwärmhinweis (Gerät, Zeit, Leistung).
- Bei ${numPersonen > 1 ? 'mehreren Personen' : 'einer Person'}: Mengenangaben in den Schritten müssen zur tatsächlichen Portionenzahl im Plan passen.
- Beispiel-Detailgrad siehe "meal_prep_guide" im JSON-Beispiel unten — genau in diesem Stil, nicht kürzer.

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
    "hinweis": "Grobe Schätzung basierend auf allgemein bekannten Durchschnittspreisen bei deutschen Supermärkten — keine Live-Preisdaten oder aktuellen Angebote, da die KI keinen Internetzugriff hat. Tatsächliche Preise können abweichen."
  },
  "meal_prep_guide": "## Hähnchen-Bowl (Vorbereitung 15 Min., Kochen 25 Min.)\\n1. Ofen auf 200°C Ober-/Unterhitze vorheizen.\\n2. 500g Hähnchenbrust in 2cm-Würfel schneiden, mit 1 EL Olivenöl, Salz, Pfeffer und 1 TL Paprikapulver in einer Schüssel vermengen.\\n3. Brokkoli (300g) in kleine Röschen teilen, auf einem Backblech verteilen, mit 1 EL Öl beträufeln.\\n4. Hähnchen und Brokkoli getrennt auf 2 Backblechen 20-22 Min. im Ofen garen, bis das Hähnchen innen nicht mehr rosa ist (Kerntemperatur 75°C) und der Brokkoli leicht gebräunt ist.\\n5. Währenddessen 200g Reis nach Packungsanweisung in Salzwasser kochen (ca. 15-18 Min.), abgießen.\\n6. Alles in Meal-Prep-Boxen aufteilen (4 Portionen à 130g Reis, 125g Hähnchen, 75g Brokkoli), 30 Min. abkühlen lassen bevor der Deckel geschlossen wird.\\n7. Im Kühlschrank bis zu 4 Tage haltbar; vor dem Essen 2-3 Min. in der Mikrowelle bei 800W erhitzen."
}`

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'KI-Service nicht konfiguriert' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const model = await pickFlashModel(apiKey)
  const maxOutputTokens = Math.min(model.outputTokenLimit, 32768)

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${apiKey}`
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens, temperature: 0.3 },
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
    const finishReason = data?.candidates?.[0]?.finishReason
    if (finishReason === 'MAX_TOKENS') {
      return new Response(JSON.stringify({ error: `Der Plan für ${numTage} Tage ist zu umfangreich für einen Durchgang. Bitte mit weniger Tagen oder weniger Mahlzeiten pro Tag erneut versuchen.` }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'KI hat kein gültiges JSON zurückgegeben.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    let plan
    try {
      plan = JSON.parse(jsonMatch[0])
    } catch {
      return new Response(JSON.stringify({ error: 'KI-Antwort war unvollständig oder fehlerhaft formatiert. Bitte nochmal erstellen.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!Array.isArray(plan?.tage) || plan.tage.length < numTage) {
      return new Response(JSON.stringify({ error: `Die KI hat nur ${plan?.tage?.length ?? 0} von ${numTage} Tagen geliefert. Bitte nochmal erstellen (ggf. mit weniger Tagen).` }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
