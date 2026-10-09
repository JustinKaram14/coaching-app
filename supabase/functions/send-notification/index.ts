import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const APP_URL = 'https://justinkaram14.github.io/coaching-app/'
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://justinkaram14.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// Schickt eine Nachricht an alle Geräte eines Nutzers.
// Erlaubt: an sich selbst (Test), der Coach an seinen Klienten oder der Klient an seinen Coach.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  webpush.setVapidDetails('mailto:justinkaram1410@gmail.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

  const { data: caller } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
  if (!caller?.user) return json({ error: 'Unauthorized' }, 401)

  const { targetUserId, title, body, url } = await req.json().catch(() => ({}))
  if (!targetUserId || !title) return json({ error: 'Missing fields' }, 400)

  if (caller.user.id !== targetUserId) {
    const { data: people } = await admin.from('profiles').select('id, coach_id').in('id', [caller.user.id, targetUserId])
    const me = people?.find((p) => p.id === caller.user.id)
    const target = people?.find((p) => p.id === targetUserId)
    const allowed = target?.coach_id === caller.user.id || me?.coach_id === targetUserId
    if (!allowed) return json({ error: 'Forbidden' }, 403)
  }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', targetUserId)
  if (!subs?.length) return json({ sent: false, reason: 'no subscription' })

  const payload = JSON.stringify({ title, body, url: url || APP_URL })
  let sent = 0
  const dead: string[] = []
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        sent++
      } catch (err) {
        // 404/410: das Gerät hat sich abgemeldet, das Abo ist ungültig
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) dead.push(s.id)
        else console.error('Push failed:', err)
      }
    }),
  )
  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead)

  return json({ sent: sent > 0, devices: sent, removed: dead.length })
})
