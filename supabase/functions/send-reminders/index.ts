import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'
import {
  addDaysISO,
  localParts,
  planAppointments,
  planNotifications,
  safeTimezone,
} from './notificationPlan.ts'

const APP_URL = 'https://justinkaram14.github.io/coaching-app/'
const MAIN_MEALS = ['Frühstück', 'Mittagessen', 'Abendessen']

type Planned = { kind: string; ref: string; title: string; body: string; url: string }

// Läuft regelmäßig (GitHub Action, alle 15 Minuten) und plant für jeden Nutzer mit Push-Abo:
// Termin-Erinnerungen und, tagsüber, "fehlt noch", Lob, Serien-Meilensteine und Wasser.
// type: "all" (Standard), "daily" (ohne Termine) oder "appointments" (nur Termine).
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok')

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  // Nur der Zeitplan darf das auslösen: GitHub-Action mit dem Service-Schlüssel oder der Supabase-Zeitplan mit dem Zugangswort CRON_SECRET
  const cronSecret = Deno.env.get('CRON_SECRET')
  const allowedByKey = req.headers.get('Authorization') === `Bearer ${serviceKey}`
  const allowedByCron = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret
  if (!allowedByKey && !allowedByCron) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)
  webpush.setVapidDetails('mailto:justinkaram1410@gmail.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

  // dryRun: nur zeigen, was gesendet würde (nichts senden, nichts vormerken)
  const { type = 'all', dryRun = false } = await req.json().catch(() => ({ type: 'all' }))
  const now = new Date()
  const summary: { users: number; sent: number; removed: number; planned?: unknown[] } = { users: 0, sent: 0, removed: 0 }
  if (dryRun) summary.planned = []

  const { data: subs } = await admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth')
  const subsByUser = new Map<string, NonNullable<typeof subs>>()
  for (const s of subs ?? []) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s])
  const userIds = [...subsByUser.keys()]
  if (!userIds.length) return respond(summary)

  const [{ data: settingsRows }, { data: profiles }] = await Promise.all([
    admin
      .from('client_settings')
      .select('user_id, timezone, notif_daily_reminder, notif_reminder_time, notif_appointments, notif_appointment_minutes, notif_praise, notif_streak, notif_water, notif_max_per_day, wasser_ziel_ml')
      .in('user_id', userIds),
    admin.from('profiles').select('id, role').in('id', userIds),
  ])
  const settingsBy = new Map((settingsRows ?? []).map((s) => [s.user_id, s]))
  const roleBy = new Map((profiles ?? []).map((p) => [p.id, p.role]))

  for (const userId of userIds) {
    try {
      const settings: any = settingsBy.get(userId) ?? {}
      const tz = safeTimezone(settings.timezone)
      const local = localParts(now, tz)
      const planned: Planned[] = []

      if (type !== 'daily') planned.push(...(await planAppointmentsFor(userId, now, settings, local.date)))
      if (type !== 'appointments' && roleBy.get(userId) === 'client') {
        planned.push(...(await planDailyFor(userId, now, settings, local.date)))
      }
      if (!planned.length) continue

      summary.users++
      if (dryRun) {
        summary.planned!.push({ userId, messages: planned.map((m) => `${m.kind}: ${m.title}`) })
        continue
      }
      for (const message of planned) {
        // Zuerst vormerken: Nur wer die Zeile anlegt, sendet. So gibt es nie doppelte Nachrichten.
        const { data: claimed } = await admin
          .from('push_log')
          .upsert({ user_id: userId, kind: message.kind, ref: message.ref, local_date: local.date }, { onConflict: 'user_id,kind,ref', ignoreDuplicates: true })
          .select('id')
        if (!claimed?.length) continue
        const result = await sendToDevices(subsByUser.get(userId) ?? [], message)
        summary.sent += result.sent
        summary.removed += result.removed
      }
    } catch (err) {
      console.error('Reminders failed for', userId, err)
    }
  }
  return respond(summary)

  function respond(body: unknown) {
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  }

  async function sendToDevices(devices: { id: string; endpoint: string; p256dh: string; auth: string }[], message: Planned) {
    const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url })
    let sent = 0
    const dead: string[] = []
    await Promise.all(
      devices.map(async (d) => {
        try {
          await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload)
          sent++
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) dead.push(d.id)
          else console.error('Push failed:', err)
        }
      }),
    )
    if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead)
    return { sent, removed: dead.length }
  }

  async function planAppointmentsFor(userId: string, at: Date, settings: any, today: string): Promise<Planned[]> {
    // Termine heute bis übermorgen (Erinnerung bis zu einem Tag vorher), eigene als Klient oder als Coach
    const days = [today, addDaysISO(today, 1), addDaysISO(today, 2)]
    const { data: events } = await admin
      .from('kalender_events')
      .select('id, titel, datum, uhrzeit, erinnerung_min, vorlage_id, client_id, coach_id')
      .in('datum', days)
      .not('uhrzeit', 'is', null)
      .or(`client_id.eq.${userId},and(coach_id.eq.${userId},client_id.is.null)`)
    if (!events?.length) return []

    const vorlageIds = [...new Set(events.map((e) => e.vorlage_id).filter(Boolean))]
    const names = new Map<string, string>()
    if (vorlageIds.length) {
      const { data: vorlagen } = await admin.from('training_vorlagen').select('id, name').in('id', vorlageIds)
      for (const v of vorlagen ?? []) names.set(v.id, v.name)
    }
    const { data: sent } = await admin.from('push_log').select('kind, ref').eq('user_id', userId).eq('kind', 'appointment')
    return planAppointments(
      events.map((e) => ({ ...e, vorlage_name: e.vorlage_id ? names.get(e.vorlage_id) : undefined })),
      at,
      settings,
      sent ?? [],
      APP_URL,
    )
  }

  async function planDailyFor(userId: string, at: Date, settings: any, today: string): Promise<Planned[]> {
    const since = addDaysISO(today, -400)
    const [weight, sleep, training, food, supps, suppLog, water, sentToday] = await Promise.all([
      admin.from('gewicht').select('datum').eq('user_id', userId).gte('datum', since),
      admin.from('schlaf').select('datum').eq('user_id', userId).gte('datum', since),
      admin.from('training').select('datum, dauer_min, trainingstyp, created_at').eq('user_id', userId).gte('datum', since),
      admin.from('food_log').select('datum, mahlzeit').eq('user_id', userId).gte('datum', since),
      admin.from('supplements').select('id').eq('user_id', userId).eq('aktiv', true),
      admin.from('supplement_log').select('supplement_id, eingenommen').eq('user_id', userId).eq('datum', today),
      admin.from('wasser_log').select('menge_ml').eq('user_id', userId).eq('datum', today),
      admin.from('push_log').select('kind, ref').eq('user_id', userId).eq('local_date', today),
    ])

    const trainingToday = (training.data ?? []).filter((t) => t.datum === today)
    const latest = trainingToday.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
    const activeSupps = new Set((supps.data ?? []).map((s) => s.id))
    const taken = new Set((suppLog.data ?? []).filter((l) => l.eingenommen && activeSupps.has(l.supplement_id)).map((l) => l.supplement_id))
    const meals = new Set((food.data ?? []).filter((f) => f.datum === today && MAIN_MEALS.includes(f.mahlzeit)).map((f) => f.mahlzeit))

    const facts = {
      weight: (weight.data ?? []).some((w) => w.datum === today),
      sleep: (sleep.data ?? []).some((s) => s.datum === today),
      training: trainingToday.length > 0,
      trainingAt: latest?.created_at ?? null,
      trainingMin: latest?.dauer_min ?? null,
      trainingType: latest?.trainingstyp ?? null,
      mealsMain: meals.size,
      supplementsTotal: activeSupps.size,
      supplementsTaken: taken.size,
      waterMl: (water.data ?? []).reduce((sum, w) => sum + (w.menge_ml ?? 0), 0),
    }

    // Serie: aufeinanderfolgende Tage mit mindestens einem Eintrag, ab heute (oder gestern, falls heute noch nichts steht)
    const dates = new Set<string>([
      ...(weight.data ?? []).map((r) => r.datum),
      ...(sleep.data ?? []).map((r) => r.datum),
      ...(training.data ?? []).map((r) => r.datum),
      ...(food.data ?? []).map((r) => r.datum),
    ])
    const includesToday = dates.has(today)
    let cursor = includesToday ? today : addDaysISO(today, -1)
    let days = 0
    while (dates.has(cursor)) {
      days++
      cursor = addDaysISO(cursor, -1)
    }

    return planNotifications({
      now: at,
      settings,
      facts,
      streak: { days, includesToday },
      // Nur die Nachrichten von heute: sie zählen zum Tageslimit und verhindern Doppelte
      sent: sentToday.data ?? [],
      appUrl: APP_URL,
    })
  }
})
