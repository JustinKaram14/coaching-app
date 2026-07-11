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

function extractMeta(html: string, property: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property.replace('og:', '')}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
  }
  return ''
}

function extractBodyText(html: string): string {
  // Remove scripts, styles, nav, footer
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .trim()
  return text.slice(0, 6000)
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

  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'URL fehlt' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Fetch the page
  let pageContent = ''
  let ogTitle = ''
  let ogDesc = ''

  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    })

    if (pageRes.ok) {
      const html = await pageRes.text()
      ogTitle = extractMeta(html, 'og:title') || extractMeta(html, 'title')
      ogDesc = extractMeta(html, 'og:description') || extractMeta(html, 'description')
      pageContent = extractBodyText(html)
    }
  } catch (e) {
    console.error('Fetch error:', e)
  }

  // TikTok oEmbed fallback for better description
  if (url.includes('tiktok.com') && !ogDesc) {
    try {
      const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
      if (oembedRes.ok) {
        const oembed = await oembedRes.json()
        ogTitle = oembed.title ?? ogTitle
        ogDesc = oembed.title ?? ogDesc
      }
    } catch { /* ignore */ }
  }

  const context = [
    ogTitle ? `Titel: ${ogTitle}` : '',
    ogDesc ? `Beschreibung: ${ogDesc}` : '',
    pageContent ? `Seiteninhalt:\n${pageContent}` : '',
  ].filter(Boolean).join('\n\n')

  if (!context.trim()) {
    return new Response(JSON.stringify({ error: 'Kein Inhalt von der URL abrufbar. Stelle sicher, dass der Post öffentlich ist.' }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const prompt = `Du bist ein Koch-Assistent. Extrahiere aus dem folgenden Inhalt eines Social Media Posts (Instagram/TikTok) oder einer Webseite alle Rezeptinformationen.

INHALT:
${context}

Antworte NUR mit diesem JSON (kein Text davor/dahinter, kein Markdown-Block):
{
  "name": "Rezeptname",
  "portionen": 1,
  "kalorien": 500,
  "protein_g": 30,
  "kohlenhydrate_g": 50,
  "fett_g": 15,
  "zutaten_text": "Vollständige Zutatenliste als Text",
  "kochanleitung": "Schritt-für-Schritt Kochanleitung. Nummeriere die Schritte (1. 2. 3. ...). Sei präzise mit Zeiten, Temperaturen und Mengen.",
  "gefunden": true
}

Falls kein Rezept gefunden wurde, setze "gefunden": false und alle anderen Felder auf null.
Kalorien, Protein, KH, Fett: schätze realistische Werte falls nicht angegeben.
Kochanleitung: extrahiere sie vollständig oder rekonstruiere sie aus dem Kontext.`

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Gemini error:', err)
      return new Response(JSON.stringify({ error: 'KI-Extraktion fehlgeschlagen' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Kein JSON')

    const recipe = JSON.parse(jsonMatch[0])
    if (!recipe.gefunden) {
      return new Response(JSON.stringify({ error: 'Kein Rezept in diesem Post gefunden.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
