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

const GEMINI_PROMPT = `Du analysierst einen personalisierten Coaching-Plan (PDF). Extrahiere die folgenden Daten und antworte NUR mit einem JSON-Objekt ohne weiteren Text oder Markdown-Codeblöcke.

Extractions-Schema:
{
  "kalorie_tagesziel": number | null,
  "protein_ziel": number | null,
  "karbs_ziel": number | null,
  "fett_ziel": number | null,
  "wasser_ziel_ml": number | null,
  "schlaf_ziel": number | null,
  "trainingsvorlagen": [
    {
      "name": string,
      "trainingstyp": string,
      "wochentag": number,
      "uebungen": [
        { "uebungsname": string, "saetze": number | null, "wdh": number | null, "gewicht_kg": number | null }
      ]
    }
  ]
}

Regeln:
- wochentag: 1=Montag, 2=Dienstag, 3=Mittwoch, 4=Donnerstag, 5=Freitag, 6=Samstag, 7=Sonntag
- wasser_ziel_ml: in Milliliter (3.5L = 3500)
- trainingstyp: wähle aus Kraft, Cardio, HIIT, Yoga, Stretching, Laufen, Sonstiges
- Wenn ein Wert nicht gefunden wird: null
- trainingsvorlagen: leeres Array [] wenn kein Trainingsplan gefunden`

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify caller is a coach of the given client
  let body: { pdfBase64?: unknown; clientId?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { pdfBase64, clientId } = body

  if (typeof clientId !== 'string' || !clientId) {
    return new Response(JSON.stringify({ error: 'clientId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (typeof pdfBase64 !== 'string' || pdfBase64.length < 100) {
    return new Response(JSON.stringify({ error: 'Invalid PDF data' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (pdfBase64.length > 10_000_000) {
    return new Response(JSON.stringify({ error: 'PDF zu groß. Maximum 7MB.' }), {
      status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Check that the caller is the coach of the client
  const { data: clientProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('coach_id')
    .eq('id', clientId)
    .single()

  if (profileErr || !clientProfile) {
    return new Response(JSON.stringify({ error: 'Client not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (clientProfile.coach_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden: not this client\'s coach' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI service not configured' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            { text: GEMINI_PROMPT },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.1,
        },
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Gemini API error:', response.status, errBody)
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Zu viele Anfragen. Bitte warte kurz.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'KI-Analyse fehlgeschlagen.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!result) {
      return new Response(JSON.stringify({ error: 'Konnte keine Daten aus dem PDF extrahieren.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
