import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'KI nicht konfiguriert' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { rezeptName, zutaten } = await req.json()
  if (!rezeptName) {
    return new Response(JSON.stringify({ error: 'rezeptName fehlt' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const prompt = `Professional food photography of "${rezeptName}". ${
    zutaten ? `Main ingredients: ${zutaten.slice(0, 200)}.` : ''
  } Close-up shot on a clean white plate, natural lighting, appetizing, high resolution, restaurant quality.`

  // Try Imagen 3 first
  try {
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`
    const imagenRes = await fetch(imagenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1', safetySetting: 'block_only_high' },
      }),
    })

    if (imagenRes.ok) {
      const imagenData = await imagenRes.json()
      const b64 = imagenData?.predictions?.[0]?.bytesBase64Encoded
      if (b64) {
        return new Response(JSON.stringify({ imageDataUrl: `data:image/jpeg;base64,${b64}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
  } catch { /* fall through to Gemini flash */ }

  // Fallback: Gemini Flash image generation
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    })

    if (geminiRes.ok) {
      const geminiData = await geminiRes.json()
      const parts = geminiData?.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png'
          return new Response(JSON.stringify({ imageDataUrl: `data:${mime};base64,${part.inlineData.data}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }
  } catch { /* fall through */ }

  return new Response(JSON.stringify({ error: 'Bildgenerierung fehlgeschlagen' }), {
    status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
