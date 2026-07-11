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

  let body: { guide?: unknown; question?: unknown; history?: unknown }
  try { body = await req.json() }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { guide, question, history } = body

  if (typeof question !== 'string' || question.trim().length < 2) {
    return new Response(JSON.stringify({ error: 'Frage fehlt.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const guideStr = typeof guide === 'string' ? guide : ''
  const historyArr = Array.isArray(history)
    ? (history as { role: string; text: string }[]).slice(-6)
    : []

  const historyText = historyArr.length > 0
    ? '\n\nBisherige Fragen:\n' + historyArr.map(h =>
        `${h.role === 'user' ? 'Nutzer' : 'Koch-Assistent'}: ${h.text}`
      ).join('\n')
    : ''

  const prompt = `Du bist ein hilfreicher Koch-Assistent. Der Nutzer kocht gerade nach folgender Meal Prep Anleitung und hat eine Frage.

MEAL PREP ANLEITUNG:
${guideStr || '(Keine Anleitung vorhanden)'}
${historyText}

AKTUELLE FRAGE des Nutzers: ${question.trim()}

Beantworte die Frage kurz, konkret und hilfreich auf Deutsch. Wenn eine Zutat ersetzt werden soll, nenne 2-3 gute Alternativen. Maximal 3 kurze Absätze.`

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
        generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Gemini error:', response.status, errBody)
      return new Response(JSON.stringify({ error: 'KI antwortet gerade nicht. Bitte erneut versuchen.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const answer: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    return new Response(JSON.stringify({ answer: answer.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('cooking-chat error:', err)
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
