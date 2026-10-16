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

// Bildmodelle der Reihe nach probieren; GEMINI_IMAGE_MODEL (Secret) hat Vorrang
const BILD_MODELLE = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview', 'gemini-3-pro-image-preview']
const BUCKET = 'rezept-bilder'

function text(s: unknown, max: number): string {
  return String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)
}

async function erzeugeBild(apiKey: string, prompt: string): Promise<{ bytes: Uint8Array; mime: string } | { fehler: string }> {
  const modelle = [Deno.env.get('GEMINI_IMAGE_MODEL'), ...BILD_MODELLE].filter((m): m is string => !!m)
  let letzter = 'Kein Bildmodell erreichbar'
  for (const modell of modelle) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modell}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      })
      if (!res.ok) { letzter = `${modell}: HTTP ${res.status}`; continue }
      const json = await res.json()
      for (const part of json?.candidates?.[0]?.content?.parts ?? []) {
        const d = part.inlineData ?? part.inline_data
        if (d?.data) {
          const bin = atob(d.data)
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          return { bytes, mime: d.mimeType ?? d.mime_type ?? 'image/png' }
        }
      }
      letzter = `${modell}: keine Bilddaten in der Antwort`
    } catch (e) {
      letzter = `${modell}: ${e instanceof Error ? e.message : 'Fehler'}`
    }
  }
  return { fehler: letzter }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'))
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'KI nicht konfiguriert' }, 503)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Ungültige Anfrage' }, 400) }

  const modus = body.modus
  const id = text(body.id, 80)
  const name = text(body.name, 100)
  const zutaten = Array.isArray(body.zutaten) ? body.zutaten.slice(0, 8).map(z => text(z, 40)).filter(Boolean) : []
  if (!name) return json({ error: 'Name fehlt' }, 400)

  let pfad: string
  if (modus === 'start') {
    // Die Startbibliothek pflegen nur Coaches
    if (!/^[a-z0-9-]{3,60}$/.test(id)) return json({ error: 'Ungültige Rezept-ID' }, 400)
    const { data: profil } = await userClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profil?.role !== 'coach') return json({ error: 'Nur Coaches dürfen die Fotos der Startbibliothek erzeugen.' }, 403)
    pfad = `start/${id}.jpg`
  } else if (modus === 'ki') {
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: 'Ungültige Rezept-ID' }, 400)
    pfad = `ki/${user.id}/${id}.jpg`
  } else {
    return json({ error: 'Unbekannter Modus' }, 400)
  }

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const bildUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${pfad}`

  if (modus === 'start' && body.erneuern !== true) {
    const ordner = await admin.storage.from(BUCKET).list('start', { search: `${id}.jpg`, limit: 5 })
    if (ordner.data?.some(f => f.name === `${id}.jpg`)) return json({ bildUrl, vorhanden: true })
  }

  const prompt = `Realistic, appetizing food photograph of "${name}"${zutaten.length ? `, made with ${zutaten.join(', ')}` : ''}. ` +
    'Served in a simple ceramic bowl or on a plate on a light wooden table, soft natural window light, shallow depth of field, ' +
    'shot from a 45-degree angle, fresh and healthy look, 4:3 composition. No text, no logos, no watermark, no people, no hands.'

  const bild = await erzeugeBild(apiKey, prompt)
  if ('fehler' in bild) return json({ error: `Das Foto konnte nicht erstellt werden (${bild.fehler}).` }, 502)

  const { error: uploadFehler } = await admin.storage.from(BUCKET).upload(pfad, bild.bytes, { contentType: bild.mime, upsert: true })
  if (uploadFehler) return json({ error: `Das Foto konnte nicht gespeichert werden (${uploadFehler.message}).` }, 500)

  return json({ bildUrl })
})
