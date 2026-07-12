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

  const { rezeptName, zutaten } = await req.json()
  if (!rezeptName) {
    return new Response(JSON.stringify({ error: 'rezeptName fehlt' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 1. Pexels (primary — free API key from pexels.com/api)
  const pexelsKey = Deno.env.get('PEXELS_API_KEY')
  if (pexelsKey) {
    try {
      const query = encodeURIComponent(`${rezeptName} food dish`)
      const searchRes = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=square`,
        { headers: { Authorization: pexelsKey } }
      )
      if (searchRes.ok) {
        const json = await searchRes.json()
        const photoUrl = json?.photos?.[0]?.src?.medium
        if (photoUrl) {
          // Fetch image and convert to base64 to avoid CSP issues with external URLs
          const imgRes = await fetch(photoUrl)
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer()
            const bytes = new Uint8Array(buffer)
            let binary = ''
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
            const b64 = btoa(binary)
            const mime = imgRes.headers.get('content-type') ?? 'image/jpeg'
            return new Response(JSON.stringify({ imageDataUrl: `data:${mime};base64,${b64}` }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
        }
      }
    } catch { /* fall through */ }
  }

  // 2. Gemini image generation (fallback — requires special API access)
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (apiKey) {
    const prompt = `Professional food photography of "${rezeptName}". ${
      zutaten ? `Main ingredients: ${String(zutaten).slice(0, 200)}.` : ''
    } Close-up shot on a clean white plate, natural lighting, appetizing, high resolution.`

    // Try current image generation model names
    for (const model of [
      'gemini-2.0-flash-preview-image-generation',
      'imagen-3.0-generate-002',
    ]) {
      try {
        const isImagen = model.startsWith('imagen')
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${isImagen ? 'predict' : 'generateContent'}?key=${apiKey}`
        const body = isImagen
          ? JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '1:1' } })
          : JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } })

        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
        if (!res.ok) continue
        const json = await res.json()

        if (isImagen) {
          const b64 = json?.predictions?.[0]?.bytesBase64Encoded
          if (b64) return new Response(JSON.stringify({ imageDataUrl: `data:image/jpeg;base64,${b64}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else {
          for (const part of json?.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData?.data) {
              const mime = part.inlineData.mimeType ?? 'image/png'
              return new Response(JSON.stringify({ imageDataUrl: `data:${mime};base64,${part.inlineData.data}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              })
            }
          }
        }
      } catch { /* try next */ }
    }
  }

  const hint = !pexelsKey
    ? 'Tipp: Füge PEXELS_API_KEY als Supabase Secret hinzu (kostenlos auf pexels.com/api) um automatische Rezeptbilder zu aktivieren.'
    : 'Pexels-Suche hat kein Ergebnis geliefert.'

  return new Response(JSON.stringify({ error: 'Kein Bild gefunden', hint }), {
    status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
