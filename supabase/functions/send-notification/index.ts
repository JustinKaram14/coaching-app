import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://justinkaram14.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64UrlToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

async function signVapid(audience: string, subject: string, privateKeyB64: string) {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payload = btoa(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const signingInput = `${header}.${payload}`
  const keyBytes = base64UrlToUint8Array(privateKeyB64)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${signingInput}.${sigB64}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { targetUserId, title, body, url } = await req.json()
  if (!targetUserId || !title) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders })

  const { data: sub } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', targetUserId)
    .single()

  if (!sub) return new Response(JSON.stringify({ sent: false, reason: 'no subscription' }), { headers: corsHeaders })

  const origin = new URL(sub.endpoint).origin
  const jwt = await signVapid(origin, 'mailto:justinkaram1410@gmail.com', vapidPrivate)

  const payload = JSON.stringify({ title, body, url: url || 'https://justinkaram14.github.io/coaching-app/' })

  const pushRes = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapidPublic}`,
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body: payload,
  })

  return new Response(JSON.stringify({ sent: pushRes.ok, status: pushRes.status }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
