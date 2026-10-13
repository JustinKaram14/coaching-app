import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ALLOWED_ORIGINS = [
  'https://justinkaram14.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:5174',
]

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

type Platform = 'youtube' | 'tiktok' | 'instagram' | 'web'

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function detectPlatform(url: string): Platform {
  const host = (() => { try { return new URL(url).hostname.toLowerCase() } catch { return '' } })()
  if (host.endsWith('youtube.com') || host === 'youtu.be') return 'youtube'
  if (host.endsWith('tiktok.com')) return 'tiktok'
  if (host.endsWith('instagram.com') || host === 'instagr.am') return 'instagram'
  return 'web'
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
}

function extractMeta(html: string, property: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property.replace('og:', '')}["'][^>]+content=["']([^"']*)["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeEntities(m[1]).trim()
  }
  return ''
}

function extractBodyText(html: string): string {
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .trim()
  return decodeEntities(text).slice(0, 6000)
}

// schema.org/Recipe (JSON-LD) – bei Rezeptseiten die zuverlässigste Quelle
function extractJsonLdRecipe(html: string): string {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1])
      const stack = Array.isArray(data) ? [...data] : [data]
      while (stack.length) {
        const node = stack.shift()
        if (!node || typeof node !== 'object') continue
        if (Array.isArray(node['@graph'])) stack.push(...node['@graph'])
        const type = node['@type']
        if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return JSON.stringify(node).slice(0, 8000)
      }
    } catch { /* ungültiges JSON-LD ignorieren */ }
  }
  return ''
}

async function fetchText(url: string, userAgent: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    })
    return res.ok ? await res.text() : ''
  } catch (e) {
    console.error('Fetch error:', url, e)
    return ''
  }
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': MOBILE_UA } })
    return res.ok ? await res.json() : null
  } catch { return null }
}

function youtubeVideoUrl(url: string): string | null {
  try {
    const u = new URL(url)
    let id = ''
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1)
    else if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/embed/') || u.pathname.startsWith('/live/')) id = u.pathname.split('/')[2] ?? ''
    else id = u.searchParams.get('v') ?? ''
    return /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null
  } catch { return null }
}

// Beschreibung und Titel direkt aus dem YouTube-Seitenquelltext (die og:description ist auf ~160 Zeichen gekürzt)
function extractYoutubeText(html: string): { title: string; description: string } {
  let description = ''
  const m = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)
  if (m) { try { description = JSON.parse(`"${m[1]}"`) } catch { description = m[1] } }
  return { title: extractMeta(html, 'og:title'), description: description || extractMeta(html, 'og:description') }
}

function extractTiktokCaption(html: string): string {
  const m = html.match(/<script[^>]+id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/)
  if (m) {
    try {
      const data = JSON.parse(m[1])
      const item = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct
      const parts = [item?.desc, item?.author?.nickname ? `Von: ${item.author.nickname}` : '']
      const text = parts.filter(Boolean).join('\n')
      if (text) return text
    } catch { /* weiter mit Meta-Tags */ }
  }
  return extractMeta(html, 'og:description')
}

// Instagram liefert die Bildunterschrift am zuverlässigsten über die Einbettungsseite
function extractInstagramCaption(embedHtml: string, pageHtml: string): string {
  const m = embedHtml.match(/<div[^>]+class=["'][^"']*\bCaption\b[^"']*["'][^>]*>([\s\S]*?)<div[^>]+class=["'][^"']*\bCaptionComments\b/i)
    ?? embedHtml.match(/<div[^>]+class=["'][^"']*\bCaption\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
  if (m) {
    const caption = decodeEntities(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim()
    if (caption.length > 20) return caption
  }
  return extractMeta(pageHtml, 'og:description')
}

interface Source {
  context: string
  videoUrl: string | null
}

async function collectSource(url: string, platform: Platform): Promise<Source> {
  const lines: string[] = []
  let videoUrl: string | null = null

  if (platform === 'youtube') {
    videoUrl = youtubeVideoUrl(url)
    const [html, oembed] = await Promise.all([
      fetchText(videoUrl ?? url, MOBILE_UA),
      fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl ?? url)}&format=json`),
    ])
    const { title, description } = extractYoutubeText(html)
    const heading = title || (oembed?.title as string | undefined) || ''
    if (heading) lines.push(`Titel: ${heading}`)
    if (oembed?.author_name) lines.push(`Kanal: ${oembed.author_name}`)
    if (description) lines.push(`Videobeschreibung:\n${description.slice(0, 6000)}`)
  } else if (platform === 'tiktok') {
    const [html, oembed] = await Promise.all([
      fetchText(url, MOBILE_UA),
      fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`),
    ])
    const caption = extractTiktokCaption(html)
    const title = (oembed?.title as string | undefined) ?? ''
    if (caption) lines.push(`Beschreibung des Videos:\n${caption}`)
    if (title && title !== caption) lines.push(`Titel: ${title}`)
    if (oembed?.author_name) lines.push(`Autor: ${oembed.author_name}`)
  } else if (platform === 'instagram') {
    const shortcode = url.match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|reels|tv)\/([\w-]+)/i)?.[1]
    const [pageHtml, embedHtml] = await Promise.all([
      fetchText(url, CRAWLER_UA),
      shortcode ? fetchText(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, MOBILE_UA) : Promise.resolve(''),
    ])
    const caption = extractInstagramCaption(embedHtml, pageHtml)
    const title = extractMeta(pageHtml, 'og:title')
    if (title) lines.push(`Titel: ${title}`)
    if (caption) lines.push(`Beschreibung des Beitrags:\n${caption}`)
  } else {
    const html = await fetchText(url, MOBILE_UA)
    const jsonLd = extractJsonLdRecipe(html)
    const title = extractMeta(html, 'og:title') || extractMeta(html, 'title')
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description')
    if (title) lines.push(`Titel: ${title}`)
    if (description) lines.push(`Beschreibung: ${description}`)
    if (jsonLd) lines.push(`Strukturierte Rezeptdaten (schema.org):\n${jsonLd}`)
    else if (html) lines.push(`Seiteninhalt:\n${extractBodyText(html)}`)
  }

  return { context: lines.join('\n\n'), videoUrl }
}

const PROMPT_INSTRUCTIONS = `Du bist ein Koch-Assistent. Extrahiere aus dem folgenden Inhalt (Social-Media-Beitrag, Video oder Webseite) das vollständige Rezept und gib es auf Deutsch zurück.

Regeln:
- "portionen": Anzahl der Portionen, für die die Zutatenmengen gelten (ganze Zahl, mindestens 1). Steht nichts da, schätze sinnvoll.
- "kalorien", "protein_g", "kohlenhydrate_g", "fett_g": Nährwerte PRO PORTION (nicht für das ganze Rezept). Stehen sie nicht im Inhalt, schätze sie realistisch aus den Zutaten und der Portionszahl und setze "naehrwerte_geschaetzt" auf true.
- "zutaten": Liste mit EINER Zutat pro Eintrag inklusive Menge und Einheit, z. B. "200 g Hähnchenbrust", "2 EL Olivenöl", "1 Zwiebel". Fehlen Mengen, ergänze übliche Mengen für die Portionszahl. Metrische Einheiten verwenden.
- "schritte": Kochanleitung als Liste, EIN Arbeitsschritt pro Eintrag, ohne Nummerierung, mit Zeiten, Temperaturen und Mengen. Wird sie im Inhalt nicht vollständig erklärt, rekonstruiere sie sinnvoll aus den Zutaten und setze "anleitung_rekonstruiert" auf true.
- "gefunden": false nur dann, wenn der Inhalt erkennbar nichts mit einem Gericht oder Rezept zu tun hat. Ist nur der Gerichtsname bekannt, rekonstruiere ein typisches Rezept (gefunden: true, anleitung_rekonstruiert: true).
- Erfinde keine Inhalte, die dem Beitrag widersprechen.`

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    gefunden: { type: 'BOOLEAN' },
    name: { type: 'STRING' },
    portionen: { type: 'INTEGER' },
    kalorien: { type: 'NUMBER' },
    protein_g: { type: 'NUMBER' },
    kohlenhydrate_g: { type: 'NUMBER' },
    fett_g: { type: 'NUMBER' },
    naehrwerte_geschaetzt: { type: 'BOOLEAN' },
    anleitung_rekonstruiert: { type: 'BOOLEAN' },
    zutaten: { type: 'ARRAY', items: { type: 'STRING' } },
    schritte: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['gefunden'],
}

async function askGemini(apiKey: string, parts: unknown[]) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })
  if (!res.ok) {
    console.error('Gemini error:', res.status, await res.text())
    return null
  }
  const data = await res.json()
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401, corsHeaders)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'KI nicht konfiguriert' }, 503, corsHeaders)

  let body: { url?: string; text?: string }
  try { body = await req.json() } catch { return json({ error: 'Ungültige Anfrage' }, 400, corsHeaders) }
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const pastedText = typeof body.text === 'string' ? body.text.trim().slice(0, 12000) : ''
  if (!url && !pastedText) return json({ error: 'Link oder Rezepttext fehlt' }, 400, corsHeaders)
  if (url && !/^https?:\/\//i.test(url)) return json({ error: 'Bitte einen vollständigen Link mit https:// angeben.' }, 400, corsHeaders)

  const platform: Platform = url ? detectPlatform(url) : 'web'
  const source: Source = url ? await collectSource(url, platform) : { context: '', videoUrl: null }
  const context = [source.context, pastedText ? `Vom Nutzer eingefügter Rezepttext:\n${pastedText}` : ''].filter(Boolean).join('\n\n')

  if (!context.trim() && !source.videoUrl) {
    return json({
      error: platform === 'instagram' || platform === 'tiktok'
        ? 'Der Beitrag konnte nicht gelesen werden (privat oder gesperrt). Kopiere die Beschreibung aus der App und füge sie unter „Rezepttext einfügen“ ein.'
        : 'Kein Inhalt von der URL abrufbar. Stelle sicher, dass der Beitrag öffentlich ist, oder füge den Rezepttext direkt ein.',
    }, 422, corsHeaders)
  }

  try {
    const parts: unknown[] = []
    // YouTube: Gemini sieht das Video selbst (Bild und Ton), so werden auch Rezepte erkannt, die nur gesprochen werden
    if (source.videoUrl) parts.push({ fileData: { fileUri: source.videoUrl } })
    parts.push({ text: `${PROMPT_INSTRUCTIONS}\n\nINHALT:\n${context || '(nur das Video)'}` })

    let recipe = await askGemini(apiKey, parts)
    // Falls die Video-Analyse scheitert (z. B. Video nicht öffentlich), mit dem Text allein erneut versuchen
    if (!recipe && source.videoUrl && context.trim()) recipe = await askGemini(apiKey, [parts[parts.length - 1]])
    if (!recipe) return json({ error: 'KI-Extraktion fehlgeschlagen. Bitte versuche es noch einmal.' }, 502, corsHeaders)
    if (!recipe.gefunden || !recipe.name) return json({ error: 'Kein Rezept in diesem Beitrag gefunden.' }, 422, corsHeaders)

    const zutaten: string[] = Array.isArray(recipe.zutaten) ? recipe.zutaten.map((z: unknown) => String(z).trim()).filter(Boolean) : []
    const schritte: string[] = Array.isArray(recipe.schritte) ? recipe.schritte.map((s: unknown) => String(s).trim()).filter(Boolean) : []

    return json({
      recipe: {
        name: recipe.name,
        portionen: Math.max(1, Math.round(recipe.portionen ?? 1)),
        kalorien: recipe.kalorien ?? null,
        protein_g: recipe.protein_g ?? null,
        kohlenhydrate_g: recipe.kohlenhydrate_g ?? null,
        fett_g: recipe.fett_g ?? null,
        naehrwerte_geschaetzt: recipe.naehrwerte_geschaetzt !== false,
        anleitung_rekonstruiert: recipe.anleitung_rekonstruiert === true,
        zutaten_text: zutaten.map(z => `- ${z.replace(/^[-•*]\s*/, '')}`).join('\n'),
        kochanleitung: schritte.map((s, i) => `${i + 1}. ${s.replace(/^\d+[.)]\s*/, '')}`).join('\n'),
        quelle: platform,
      },
    }, 200, corsHeaders)
  } catch (err) {
    console.error('Error:', err)
    return json({ error: 'Interner Fehler' }, 500, corsHeaders)
  }
})
