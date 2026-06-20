import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok')

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!

  webpush.setVapidDetails('mailto:justinkaram1410@gmail.com', vapidPublic, vapidPrivate)

  const { type } = await req.json().catch(() => ({ type: 'daily' }))
  const nowUTC = new Date()
  const sent: string[] = []

  async function push(userId: string, title: string, body: string, url: string) {
    const { data: sub } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId).single()
    if (!sub) return
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url })
      )
      sent.push(userId)
    } catch (e) {
      console.error('Push failed for', userId, e)
    }
  }

  if (type === 'daily') {
    const { data: users } = await supabase
      .from('client_settings')
      .select('user_id, notif_reminder_time')
      .eq('notif_daily_reminder', true)

    for (const u of users ?? []) {
      const [h] = (u.notif_reminder_time ?? '20:00').split(':').map(Number)
      if (h !== nowUTC.getUTCHours()) continue
      await push(u.user_id, 'Tageseintrag ✍️', 'Denk daran, deine Ernährung, Training und Schlaf einzutragen!', 'https://justinkaram14.github.io/coaching-app/')
    }
  }

  if (type === 'appointments') {
    const todayDate = nowUTC.toISOString().split('T')[0]
    const { data: events } = await supabase
      .from('kalender_events')
      .select('client_id, titel, datum, uhrzeit')
      .eq('datum', todayDate)
      .not('client_id', 'is', null)
      .not('uhrzeit', 'is', null)

    for (const ev of events ?? []) {
      const evTime = new Date(`${ev.datum}T${ev.uhrzeit}:00Z`)
      const diffMin = (evTime.getTime() - nowUTC.getTime()) / 60000
      if (diffMin < 55 || diffMin > 65) continue

      const { data: settings } = await supabase.from('client_settings').select('notif_appointments').eq('user_id', ev.client_id).single()
      if (settings?.notif_appointments === false) continue

      await push(ev.client_id, `Termin in 1 Stunde 📅`, `${ev.titel} um ${ev.uhrzeit} Uhr`, 'https://justinkaram14.github.io/coaching-app/#/calendar')
    }
  }

  return new Response(JSON.stringify({ sent: sent.length, ids: sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
