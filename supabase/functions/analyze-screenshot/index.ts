import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://justinkaram14.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
const ALLOWED_CONTEXTS = new Set(['nutrition', 'training', 'sleep'])

const PROMPTS: Record<string, string> = {
  nutrition: 'Analysiere dieses Bild (Mahlzeit, Rezept, Lebensmitteletikett oder Screenshot). Schätze die Gesamtnährwerte und antworte NUR mit einem JSON-Objekt ohne weiteren Text: {"kalorien": number, "protein_g": number, "kohlenhydrate_g": number, "fett_g": number, "notizen": "kurze Beschreibung der Mahlzeit"}',
  training: 'Analysiere diesen Screenshot einer Trainings-App oder Apple Watch Workout-Zusammenfassung. Extrahiere die Trainingsdaten und antworte NUR mit einem JSON-Objekt ohne weiteren Text. Für trainingstyp wähle einen aus: Kraft, Cardio, HIIT, Yoga, Stretching, Schwimmen, Radfahren, Laufen, Sonstiges. {"dauer_min": number | null, "avg_puls": number | null, "kalorien_verbrannt": number | null, "trainingstyp": string, "notizen": "kurze Beschreibung des Workouts"}',
  sleep: 'Analysiere diesen Screenshot einer Schlaf-App (Apple Health, Oura, Whoop, Garmin o.ä.). Extrahiere die Schlafdaten und antworte NUR mit einem JSON-Objekt ohne weiteren Text. Zeiten im Format HH:MM (24h). Schlafqualität als Zahl 1-10. {"einschlafzeit": "HH:MM" | null, "aufwachzeit": "HH:MM" | null, "schlafqualitaet": number | null, "notizen": "kurze Zusammenfassung"}',
}

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- AUTHENTICATION: verify JWT belongs to a valid Supabase user ---
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- INPUT VALIDATION ---
  let body: { imageBase64?: unknown; mimeType?: unknown; context?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { imageBase64, mimeType, context } = body

  if (typeof context !== 'string' || !ALLOWED_CONTEXTS.has(context)) {
    return new Response(JSON.stringify({ error: 'Invalid context' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return new Response(JSON.stringify({ error: 'Invalid image type. Allowed: jpeg, png, webp, gif, heic' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    return new Response(JSON.stringify({ error: 'Invalid image data' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Limit image size to ~5MB base64 (~3.75MB raw)
  if (imageBase64.length > 5_000_000) {
    return new Response(JSON.stringify({ error: 'Image too large. Maximum 5MB.' }), {
      status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- ANTHROPIC API CALL ---
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI service not configured' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
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
            { type: 'text', text: PROMPTS[context] },
          ]
        }]
      }),
    })

    if (!response.ok) {
      console.error('Anthropic API error:', response.status)
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    // Log internally but don't expose to client
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
