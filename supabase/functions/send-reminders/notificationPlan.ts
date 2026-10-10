// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
// Planung der Push-Nachrichten (Erinnerung, Lob, Serie, Wasser, Termine). Reine Funktionen ohne Abhängigkeiten.
// Dieselbe Datei liegt als supabase/functions/send-reminders/notificationPlan.ts für die Edge Function (bei Änderungen beide anpassen).

export const COUNTED_KINDS = ['missing', 'praise', 'streak', 'water']
export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 300, 365, 500, 730, 1e3]
export const DEFAULT_TIMEZONE = 'Europe/Berlin'
export function safeTimezone(zone) {
  if (!zone) return DEFAULT_TIMEZONE
  try {
    return (
      new Intl.DateTimeFormat('de-DE', {
        timeZone: zone,
      }),
      zone
    )
  } catch {
    return DEFAULT_TIMEZONE
  }
}
export function localParts(dateValue, zone) {
  let parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(dateValue),
    part = (partType) => Number(parts.find((item) => item.type === partType)?.value ?? 0),
    pad = (num) => String(num).padStart(2, '0')
  return {
    date: `${part('year')}-${pad(part('month'))}-${pad(part('day'))}`,
    minutes: part('hour') * 60 + part('minute'),
  }
}
export function timezoneOffsetMs(dateValue, zone) {
  let local = localParts(dateValue, zone),
    [yearNum, monthNum, dayNum] = local.date.split('-').map(Number)
  return Date.UTC(yearNum, monthNum - 1, dayNum, Math.floor(local.minutes / 60), local.minutes % 60) - Math.floor(dateValue.getTime() / 6e4) * 6e4
}
export function localDateTime(dateISO, time, zone) {
  let [yearNum, monthNum, dayNum] = dateISO.split('-').map(Number),
    [hourNum, minuteNum] = time.split(':').map(Number),
    utcMs = Date.UTC(yearNum, monthNum - 1, dayNum, hourNum, minuteNum || 0),
    guess = utcMs - timezoneOffsetMs(new Date(utcMs), zone)
  return ((guess = utcMs - timezoneOffsetMs(new Date(guess), zone)), new Date(guess))
}
export function parseMinutes(text, fallback) {
  let match = /^(\d{1,2}):(\d{2})/.exec(text ?? '')
  if (!match) return fallback
  let hours = Number(match[1]),
    mins = Number(match[2])
  return hours > 23 || mins > 59 ? fallback : hours * 60 + mins
}
export function addDaysISO(dateISO, dayOffset) {
  let [yearNum, monthNum, dayNum] = dateISO.split('-').map(Number),
    result = new Date(Date.UTC(yearNum, monthNum - 1, dayNum + dayOffset))
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`
}
export function missingParts(dayFacts) {
  let parts = []
  return (
    dayFacts.mealsMain < 3 && parts.push('Ernährung'),
    dayFacts.sleep || parts.push('Schlaf'),
    dayFacts.supplementsTotal > 0 && dayFacts.supplementsTaken < dayFacts.supplementsTotal && parts.push('Supplements'),
    parts
  )
}
export function hasAnyEntry(dayFacts) {
  return dayFacts.weight || dayFacts.sleep || dayFacts.training || dayFacts.mealsMain > 0 || dayFacts.supplementsTaken > 0 || dayFacts.waterMl > 0
}
export function joinGerman(items) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`
}
export const formatLiters1 = (ml) =>
  (ml / 1e3).toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  })
export function planNotifications(input) {
  let { now: nowDate, settings: cfg, facts: factsData, streak: streakData, sent: sentList, appUrl: baseUrl } = input,
    { date: today, minutes: minuteOfDay } = localParts(nowDate, safeTimezone(cfg.timezone))
  if (minuteOfDay < 480 || minuteOfDay >= 1320) return []
  let maxPerDay = Math.min(3, Math.max(1, cfg.notif_max_per_day ?? 3)),
    wasSent = (messageKind, messageRef) => sentList.some((entry) => entry.kind === messageKind && (messageRef === undefined || entry.ref === messageRef)),
    countedToday = sentList.filter((entry) => COUNTED_KINDS.includes(entry.kind)).length,
    plannedMessages = [],
    hasRoom = (messageKind) => (messageKind === 'missing' || messageKind === 'streak' ? countedToday < maxPerDay : countedToday < maxPerDay - 1),
    add = (message) => {
      ;(plannedMessages.push(message), countedToday++)
    },
    reminderMinute = parseMinutes(cfg.notif_reminder_time, 1200),
    missing = missingParts(factsData)
  if (cfg.notif_daily_reminder !== false && minuteOfDay >= reminderMinute && !wasSent('missing') && hasRoom('missing')) {
    let streakText = streakData.days >= 3 ? ` Deine ${streakData.days}-Tage-Serie wartet auf dich.` : ''
    hasAnyEntry(factsData)
      ? missing.length > 0 &&
        add({
          kind: 'missing',
          ref: today,
          title: 'Fast geschafft',
          body: `Heute fehlt dir noch: ${joinGerman(missing)}.${streakText}`,
          url: `${baseUrl}#/dashboard`,
        })
      : add({
          kind: 'missing',
          ref: today,
          title: 'Heute noch nichts eingetragen',
          body: `Ein kurzer Eintrag reicht: Essen, Schlaf oder Gewicht.${streakText}`,
          url: `${baseUrl}#/dashboard`,
        })
  }
  if (
    cfg.notif_streak !== false &&
    streakData.includesToday &&
    STREAK_MILESTONES.includes(streakData.days) &&
    !wasSent('streak', `${streakData.days}@${addDaysISO(today, -(streakData.days - 1))}`) &&
    hasRoom('streak')
  ) {
    let streakDays = streakData.days,
      bodyText =
        streakDays >= 100
          ? 'Das ist Disziplin auf Profi-Niveau.'
          : streakDays >= 30
            ? 'Ein ganzer Monat Routine, richtig stark.'
            : streakDays >= 7
              ? 'Genau so entstehen Gewohnheiten.'
              : 'Der Anfang ist gemacht, bleib dran.'
    add({
      kind: 'streak',
      ref: `${streakDays}@${addDaysISO(today, -(streakDays - 1))}`,
      title: `${streakDays} Tage am Stück`,
      body: bodyText,
      url: `${baseUrl}#/dashboard`,
    })
  }
  if (cfg.notif_praise !== false && !wasSent('praise') && hasRoom('praise'))
    if (factsData.training && (!factsData.trainingAt || nowDate.getTime() - new Date(factsData.trainingAt).getTime() >= 10 * 6e4)) {
      let minutesText = factsData.trainingMin ? `${factsData.trainingMin} Minuten ` : '',
        typeText = factsData.trainingType ? `${factsData.trainingType}` : 'Training'
      add({
        kind: 'praise',
        ref: `train:${today}`,
        title: 'Heute schon fleißig trainiert',
        body: `${minutesText}${typeText}, stark gemacht. Gönn dir jetzt Erholung und genug Eiweiß.`,
        url: `${baseUrl}#/training`,
      })
    } else
      minuteOfDay >= 1020 &&
        hasAnyEntry(factsData) &&
        missing.length === 0 &&
        (factsData.weight || factsData.sleep || factsData.mealsMain >= 3) &&
        add({
          kind: 'praise',
          ref: `all:${today}`,
          title: 'Alles eingetragen',
          body: 'Starker Tag, du bist komplett dabei.',
          url: `${baseUrl}#/dashboard`,
        })
  let waterGoal = cfg.wasser_ziel_ml ?? 0
  return (
    cfg.notif_water !== false &&
      waterGoal > 0 &&
      minuteOfDay >= 900 &&
      minuteOfDay < 1140 &&
      factsData.waterMl < waterGoal * 0.5 &&
      !wasSent('water') &&
      hasRoom('water') &&
      add({
        kind: 'water',
        ref: today,
        title: 'Zeit für ein Glas Wasser',
        body: `Bisher ${formatLiters1(factsData.waterMl)} l von ${formatLiters1(waterGoal)} l. Ein Glas jetzt tut dir gut.`,
        url: `${baseUrl}#/nutrition`,
      }),
    plannedMessages
  )
}
export function leadTimeText(leadMinutes) {
  return leadMinutes >= 1440 && leadMinutes % 1440 == 0
    ? leadMinutes === 1440
      ? 'morgen'
      : `in ${leadMinutes / 1440} Tagen`
    : leadMinutes >= 60 && leadMinutes % 60 == 0
      ? leadMinutes === 60
        ? 'in 1 Stunde'
        : `in ${leadMinutes / 60} Stunden`
      : `in ${leadMinutes} Minuten`
}
export function planAppointments(events, now, settings, sent, appUrl) {
  if (settings.notif_appointments === false) return []
  let timezone = safeTimezone(settings.timezone),
    planned = []
  for (let event of events) {
    if (!event.uhrzeit) continue
    let leadMin = event.erinnerung_min ?? settings.notif_appointment_minutes ?? 60
    if (leadMin <= 0) continue
    let startsAt = localDateTime(event.datum, event.uhrzeit.slice(0, 5), timezone),
      remindAt = startsAt.getTime() - leadMin * 6e4
    if (
      now.getTime() < remindAt ||
      now.getTime() >= startsAt.getTime() ||
      sent.some((entry) => entry.kind === 'appointment' && entry.ref === event.id)
    )
      continue
    let leadText = leadTimeText(leadMin)
    planned.push({
      kind: 'appointment',
      ref: event.id,
      title: `Termin ${leadText}`,
      body: `${event.titel} um ${event.uhrzeit.slice(0, 5)} Uhr${event.vorlage_name ? ` · Vorlage: ${event.vorlage_name}` : ''}`,
      url: `${appUrl}#/calendar`,
    })
  }
  return planned
}
