// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
// Planung der Push-Nachrichten (Erinnerung, Lob, Serie, Wasser, Termine). Reine Funktionen ohne Abhängigkeiten.
// Dieselbe Datei liegt als supabase/functions/send-reminders/notificationPlan.ts für die Edge Function (bei Änderungen beide anpassen).

export const COUNTED_KINDS = ['missing', 'praise', 'streak', 'water']
export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 300, 365, 500, 730, 1e3]
export const DEFAULT_TIMEZONE = 'Europe/Berlin'
export function safeTimezone(e) {
  if (!e) return DEFAULT_TIMEZONE
  try {
    return (
      new Intl.DateTimeFormat('de-DE', {
        timeZone: e,
      }),
      e
    )
  } catch {
    return DEFAULT_TIMEZONE
  }
}
export function localParts(e, t) {
  let n = new Intl.DateTimeFormat('en-CA', {
      timeZone: t,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(e),
    r = (e) => Number(n.find((t) => t.type === e)?.value ?? 0),
    i = (e) => String(e).padStart(2, '0')
  return {
    date: `${r('year')}-${i(r('month'))}-${i(r('day'))}`,
    minutes: r('hour') * 60 + r('minute'),
  }
}
export function timezoneOffsetMs(e, t) {
  let n = localParts(e, t),
    [r, i, a] = n.date.split('-').map(Number)
  return Date.UTC(r, i - 1, a, Math.floor(n.minutes / 60), n.minutes % 60) - Math.floor(e.getTime() / 6e4) * 6e4
}
export function localDateTime(e, t, n) {
  let [r, i, a] = e.split('-').map(Number),
    [o, s] = t.split(':').map(Number),
    c = Date.UTC(r, i - 1, a, o, s || 0),
    l = c - timezoneOffsetMs(new Date(c), n)
  return ((l = c - timezoneOffsetMs(new Date(l), n)), new Date(l))
}
export function parseMinutes(e, t) {
  let n = /^(\d{1,2}):(\d{2})/.exec(e ?? '')
  if (!n) return t
  let r = Number(n[1]),
    i = Number(n[2])
  return r > 23 || i > 59 ? t : r * 60 + i
}
export function addDaysISO(e, t) {
  let [n, r, i] = e.split('-').map(Number),
    a = new Date(Date.UTC(n, r - 1, i + t))
  return `${a.getUTCFullYear()}-${String(a.getUTCMonth() + 1).padStart(2, '0')}-${String(a.getUTCDate()).padStart(2, '0')}`
}
export function missingParts(e) {
  let t = []
  return (
    e.mealsMain < 3 && t.push('Ernährung'),
    e.sleep || t.push('Schlaf'),
    e.supplementsTotal > 0 && e.supplementsTaken < e.supplementsTotal && t.push('Supplements'),
    t
  )
}
export function hasAnyEntry(e) {
  return e.weight || e.sleep || e.training || e.mealsMain > 0 || e.supplementsTaken > 0 || e.waterMl > 0
}
export function joinGerman(e) {
  return e.length <= 1 ? e.join('') : `${e.slice(0, -1).join(', ')} und ${e[e.length - 1]}`
}
export const formatLiters1 = (e) =>
  (e / 1e3).toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  })
export function planNotifications(input) {
  let { now: t, settings: n, facts: r, streak: i, sent: a, appUrl: o } = input,
    { date: s, minutes: c } = localParts(t, safeTimezone(n.timezone))
  if (c < 480 || c >= 1320) return []
  let l = Math.min(3, Math.max(1, n.notif_max_per_day ?? 3)),
    u = (e, t) => a.some((n) => n.kind === e && (t === undefined || n.ref === t)),
    d = a.filter((e) => COUNTED_KINDS.includes(e.kind)).length,
    f = [],
    p = (e) => (e === 'missing' || e === 'streak' ? d < l : d < l - 1),
    m = (e) => {
      ;(f.push(e), d++)
    },
    h = parseMinutes(n.notif_reminder_time, 1200),
    g = missingParts(r)
  if (n.notif_daily_reminder !== false && c >= h && !u('missing') && p('missing')) {
    let e = i.days >= 3 ? ` Deine ${i.days}-Tage-Serie wartet auf dich.` : ''
    hasAnyEntry(r)
      ? g.length > 0 &&
        m({
          kind: 'missing',
          ref: s,
          title: 'Fast geschafft',
          body: `Heute fehlt dir noch: ${joinGerman(g)}.${e}`,
          url: `${o}#/dashboard`,
        })
      : m({
          kind: 'missing',
          ref: s,
          title: 'Heute noch nichts eingetragen',
          body: `Ein kurzer Eintrag reicht: Essen, Schlaf oder Gewicht.${e}`,
          url: `${o}#/dashboard`,
        })
  }
  if (
    n.notif_streak !== false &&
    i.includesToday &&
    STREAK_MILESTONES.includes(i.days) &&
    !u('streak', `${i.days}@${addDaysISO(s, -(i.days - 1))}`) &&
    p('streak')
  ) {
    let e = i.days,
      t =
        e >= 100
          ? 'Das ist Disziplin auf Profi-Niveau.'
          : e >= 30
            ? 'Ein ganzer Monat Routine, richtig stark.'
            : e >= 7
              ? 'Genau so entstehen Gewohnheiten.'
              : 'Der Anfang ist gemacht, bleib dran.'
    m({
      kind: 'streak',
      ref: `${e}@${addDaysISO(s, -(e - 1))}`,
      title: `${e} Tage am Stück`,
      body: t,
      url: `${o}#/dashboard`,
    })
  }
  if (n.notif_praise !== false && !u('praise') && p('praise'))
    if (r.training && (!r.trainingAt || t.getTime() - new Date(r.trainingAt).getTime() >= 10 * 6e4)) {
      let e = r.trainingMin ? `${r.trainingMin} Minuten ` : '',
        t = r.trainingType ? `${r.trainingType}` : 'Training'
      m({
        kind: 'praise',
        ref: `train:${s}`,
        title: 'Heute schon fleißig trainiert',
        body: `${e}${t}, stark gemacht. Gönn dir jetzt Erholung und genug Eiweiß.`,
        url: `${o}#/training`,
      })
    } else
      c >= 1020 &&
        hasAnyEntry(r) &&
        g.length === 0 &&
        (r.weight || r.sleep || r.mealsMain >= 3) &&
        m({
          kind: 'praise',
          ref: `all:${s}`,
          title: 'Alles eingetragen',
          body: 'Starker Tag, du bist komplett dabei.',
          url: `${o}#/dashboard`,
        })
  let waterGoal = n.wasser_ziel_ml ?? 0
  return (
    n.notif_water !== false &&
      waterGoal > 0 &&
      c >= 900 &&
      c < 1140 &&
      r.waterMl < waterGoal * 0.5 &&
      !u('water') &&
      p('water') &&
      m({
        kind: 'water',
        ref: s,
        title: 'Zeit für ein Glas Wasser',
        body: `Bisher ${formatLiters1(r.waterMl)} l von ${formatLiters1(waterGoal)} l. Ein Glas jetzt tut dir gut.`,
        url: `${o}#/nutrition`,
      }),
    f
  )
}
export function leadTimeText(e) {
  return e >= 1440 && e % 1440 == 0
    ? e === 1440
      ? 'morgen'
      : `in ${e / 1440} Tagen`
    : e >= 60 && e % 60 == 0
      ? e === 60
        ? 'in 1 Stunde'
        : `in ${e / 60} Stunden`
      : `in ${e} Minuten`
}
export function planAppointments(events, now, settings, sent, appUrl) {
  if (settings.notif_appointments === false) return []
  let timezone = safeTimezone(settings.timezone),
    planned = []
  for (let s of events) {
    if (!s.uhrzeit) continue
    let e = s.erinnerung_min ?? settings.notif_appointment_minutes ?? 60
    if (e <= 0) continue
    let c = localDateTime(s.datum, s.uhrzeit.slice(0, 5), timezone),
      l = c.getTime() - e * 6e4
    if (
      now.getTime() < l ||
      now.getTime() >= c.getTime() ||
      sent.some((e) => e.kind === 'appointment' && e.ref === s.id)
    )
      continue
    let u = leadTimeText(e)
    planned.push({
      kind: 'appointment',
      ref: s.id,
      title: `Termin ${u}`,
      body: `${s.titel} um ${s.uhrzeit.slice(0, 5)} Uhr${s.vorlage_name ? ` · Vorlage: ${s.vorlage_name}` : ''}`,
      url: `${appUrl}#/calendar`,
    })
  }
  return planned
}
