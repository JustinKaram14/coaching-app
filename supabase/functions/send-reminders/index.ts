import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*' }

async function sendWebPush(endpoint: string, p256dh: string, auth: string, payload: string, vapidPublic: string, vapidPrivate: string) {
  function b64ToArr(b64: string) {
    const pad = '='.repeat((4 - b64.length % 4) % 4)
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
  }
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/[=+/]/g, c => ({ '=': '', '+': '-', '/': '_' }[c] ?? c))
  const pl = btoa(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 43200, sub: 'mailto:justinkaram1410@gmail.com' })).replace(/[=+/]/g, c => ({ '=': '', '+': '-', '/': '_' }[c] ?? c))
  const key = await crypto.subtle.importKey('pkcs8', b64ToArr(vapidPrivate), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${pl}`))
  const jwt = `${header}.${pl}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[=+/]/g, c => ({ '=': '', '+': '-', '/': '_' }[c] ?? c))}`
  return fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `vapid t=${jwt},k=${vapidPublic}`, 'Content-Type': 'application/json', TTL: '86400' },
    body: payload,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!

  const { type } = await req.json().catch(() => ({ type: 'daily' }))
  const nowUTC = new Date()
  const sent: string[] = []

  if (type === 'daily') {
    // Find users whose reminder time matches current UTC hour
    const { data: users } = await supabase
      .from('client_settings')
      .select('user_id, notif_reminder_time')
      .eq('notif_daily_reminder', true)

    for (const u of users ?? []) {
      const [h] = (u.notif_reminder_time ?? '20:00').split(':').map(Number)
      if (h !== nowUTC.getUTCHours()) continue
      const { data: sub } = await supabase.from('push_subscriptions').select('*').eq('user_id', u.user_id).single()
      if (!sub) continue
      await sendWebPush(sub.endpoint, sub.p256dh, sub.auth,
        JSON.stringify({ title: 'Tageseintrag', body: 'Denk daran, deine Ernährung, Training und Schlaf einzutragen!', url: 'https://justinkaram14.github.io/coaching-app/' }),
        vapidPublic, vapidPrivate)
      sent.push(u.user_id)
    }
  }

  if (type === 'appointments') {
    // Find appointments starting in ~60 min (±5 min window)
    const soon = new Date(nowUTC.getTime() + 55 * 60000).toISOString()
    const soonEnd = new Date(nowUTC.getTime() + 65 * 60000).toISOString()
    const todayDate = nowUTC.toISOString().split('T')[0]

    const { data: events } = await supabase
      .from('kalender_events')
      .select('client_id, titel, datum, uhrzeit')
      .eq('datum', todayDate)
      .not('client_id', 'is', null)

    for (const ev of events ?? []) {
      if (!ev.uhrzeit) continue
      const [eh, em] = ev.uhrzeit.split(':').map(Number)
      const evTime = new Date(`${ev.datum}T${ev.uhrzeit}:00Z`)
      if (evTime < new Date(soon) || evTime > new Date(soonEnd)) continue

      const { data: settings } = await supabase.from('client_settings').select('notif_appointments, notif_appointment_minutes').eq('user_id', ev.client_id).single()
      if (!settings?.notif_appointments) continue

      const { data: sub } = await supabase.from('push_subscriptions').select('*').eq('user_id', ev.client_id).single()
      if (!sub) continue

      await sendWebPush(sub.endpoint, sub.p256dh, sub.auth,
        JSON.stringify({ title: 'Termin in 1 Stunde', body: `${ev.titel} um ${ev.uhrzeit} Uhr`, url: 'https://justinkaram14.github.io/coaching-app/#/calendar' }),
        vapidPublic, vapidPrivate)
      sent.push(ev.client_id)
    }
  }

  return new Response(JSON.stringify({ sent: sent.length, ids: sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
