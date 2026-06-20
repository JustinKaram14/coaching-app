import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPTS: Record<string, string> = {
  nutrition: 'Analysiere dieses Bild (Mahlzeit, Rezept, Lebensmitteletikett oder Screenshot). Schätze die Gesamtnährwerte und antworte NUR mit einem JSON-Objekt ohne weiteren Text: {"kalorien": number, "protein_g": number, "kohlenhydrate_g": number, "fett_g": number, "notizen": "kurze Beschreibung der Mahlzeit"}',

  training: 'Analysiere diesen Screenshot einer Trainings-App oder Apple Watch Workout-Zusammenfassung. Extrahiere die Trainingsdaten und antworte NUR mit einem JSON-Objekt ohne weiteren Text. Für trainingstyp wähle einen aus: Kraft, Cardio, HIIT, Yoga, Stretching, Schwimmen, Radfahren, Laufen, Sonstiges. {"dauer_min": number | null, "avg_puls": number | null, "kalorien_verbrannt": number | null, "trainingstyp": string, "notizen": "kurze Beschreibung des Workouts"}',

  sleep: 'Analysiere diesen Screenshot einer Schlaf-App (Apple Health, Oura, Whoop, Garmin o.ä.). Extrahiere die Schlafdaten und antworte NUR mit einem JSON-Objekt ohne weiteren Text. Zeiten im Format HH:MM (24h). Schlafqualität als Zahl 1-10 (falls ein Score/Prozent angegeben ist, auf 10er Skala umrechnen). {"einschlafzeit": "HH:MM" | null, "aufwachzeit": "HH:MM" | null, "schlafqualitaet": number | null, "notizen": "kurze Zusammenfassung des Schlafs"}',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, mimeType, context } = await req.json()

    const prompt = PROMPTS[context]
    if (!prompt) {
      return new Response(JSON.stringify({ error: `Unknown context: ${context}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: prompt },
          ]
        }]
      }),
    })

    const data = await response.json()
    const text = data?.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
