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

  const { rezeptName, zutaten_text, kalorien, protein_g, kohlenhydrate_g, fett_g, portionen } = await req.json()
  if (!rezeptName) {
    return new Response(JSON.stringify({ error: 'rezeptName fehlt' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const makroText = [
    kalorien ? `${kalorien} kcal` : null,
    protein_g ? `${protein_g}g Protein` : null,
    kohlenhydrate_g ? `${kohlenhydrate_g}g KH` : null,
    fett_g ? `${fett_g}g Fett` : null,
  ].filter(Boolean).join(' | ')

  const prompt = `Erstelle eine ausführliche, präzise Schritt-für-Schritt Kochanleitung auf Deutsch für folgendes Rezept:

Rezept: "${rezeptName}"
Portionen: ${portionen || 1}
Nährwerte pro Portion: ${makroText || 'nicht bekannt'}
${zutaten_text ? `\nZutaten:\n${zutaten_text}` : ''}

Anforderungen:
- Nummerierte Schritte (1. 2. 3. ...)
- Ausschließlich Kochschritte — von der Vorbereitung bis das Gericht fertig gekocht ist
- Exakte Mengenangaben (g, ml, EL, TL, Stück)
- Exakte Garzeiten in Minuten
- Exakte Temperaturen in °C (Ober-/Unterhitze oder Umluft angeben wo relevant)
- Schnittgröße bei Gemüse/Fleisch (z.B. "2 cm Würfel", "dünne Scheiben")
- Konkretes Gar-Kriterium (z.B. "bis Kerntemperatur 75°C", "bis goldbraun", "bissfest")
- NICHT enthalten: Aufbewahrungshinweise, Kühlschrank-Tipps, Anrichte-Vorschläge, Servier-Empfehlungen

Antworte NUR mit der nummerierten Kochanleitung. Kein Titel, keine Einleitung, kein Kommentar.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
        }),
      }
    )

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'KI-Anfrage fehlgeschlagen' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    const kochanleitung = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    if (!kochanleitung) {
      return new Response(JSON.stringify({ error: 'Keine Anleitung erhalten' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ kochanleitung }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
