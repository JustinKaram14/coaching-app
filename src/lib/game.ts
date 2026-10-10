// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.

export const xpForLevel = (levelNumber) => 100 + 25 * (levelNumber - 1)
export const xpAtLevelStart = (levelNumber) => 100 * (levelNumber - 1) + (25 * (levelNumber - 1) * (levelNumber - 2)) / 2
export function levelInfo(totalXp) {
  let xpClamped = Math.max(0, Math.floor(totalXp)),
    currentLevel = 1
  for (; xpAtLevelStart(currentLevel + 1) <= xpClamped;) currentLevel++
  let xpIntoLevel = xpClamped - xpAtLevelStart(currentLevel),
    xpNeeded = xpForLevel(currentLevel)
  return {
    level: currentLevel,
    xpInto: xpIntoLevel,
    xpNeed: xpNeeded,
    pct: Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)),
    next: currentLevel + 1,
  }
}
export const LEVEL_TITLES = [
  [1, 'Starter'],
  [3, 'Dranbleiber'],
  [5, 'Aktivposten'],
  [8, 'Power-Athlet'],
  [12, 'Routine-Profi'],
  [16, 'Champion'],
  [20, 'Legende'],
  [30, 'Ikone'],
]
export function levelTitle(levelNumber) {
  let titleFound = LEVEL_TITLES[0][1]
  for (let [fromLevel, levelName] of LEVEL_TITLES) levelNumber >= fromLevel && (titleFound = levelName)
  return titleFound
}
export const XP_MEALS = ['Frühstück', 'Mittagessen', 'Abendessen']
export const STREAK_BONUS = {
  3: {
    xp: 15,
    punkte: 10,
  },
  7: {
    xp: 40,
    punkte: 25,
  },
  14: {
    xp: 80,
    punkte: 40,
  },
  21: {
    xp: 100,
    punkte: 50,
  },
  30: {
    xp: 150,
    punkte: 75,
  },
  50: {
    xp: 200,
    punkte: 100,
  },
  75: {
    xp: 250,
    punkte: 125,
  },
  100: {
    xp: 300,
    punkte: 200,
  },
  150: {
    xp: 350,
    punkte: 250,
  },
  200: {
    xp: 400,
    punkte: 300,
  },
  365: {
    xp: 500,
    punkte: 500,
  },
}
export function isGreenDay(day) {
  let mealsOk = XP_MEALS.every((requiredMeal) => day.mealsMain.includes(requiredMeal)),
    supplementsOk = day.supplementsTotal === 0 || day.supplementsTaken >= day.supplementsTotal
  return mealsOk && day.sleep && supplementsOk
}
export function dailyXpEvents(day) {
  let events = []
  for (let meal of XP_MEALS)
    day.mealsMain.includes(meal) &&
      events.push({
        quelle: 'mahlzeit',
        ref: `${day.date}:${meal}`,
        xp: 6,
        punkte: 0,
        titel: `${meal} eingetragen`,
      })
  ;(day.sleep &&
    events.push({
      quelle: 'schlaf',
      ref: day.date,
      xp: 8,
      punkte: 0,
      titel: 'Schlaf eingetragen',
    }),
    day.weight &&
      events.push({
        quelle: 'gewicht',
        ref: day.date,
        xp: 5,
        punkte: 0,
        titel: 'Gewogen',
      }))
  for (let trainingNo = 0; trainingNo < Math.min(2, day.trainingIds.length); trainingNo++)
    events.push({
      quelle: 'training',
      ref: `${day.date}:${trainingNo + 1}`,
      xp: 30,
      punkte: 10,
      titel: 'Training geschafft',
    })
  return (
    day.supplementsTotal > 0 &&
      day.supplementsTaken >= day.supplementsTotal &&
      events.push({
        quelle: 'supplements',
        ref: day.date,
        xp: 8,
        punkte: 0,
        titel: 'Supplements genommen',
      }),
    day.waterGoalMl > 0 &&
      day.waterMl >= day.waterGoalMl &&
      events.push({
        quelle: 'wasser',
        ref: day.date,
        xp: 20,
        punkte: 10,
        titel: 'Wasserziel erreicht',
      }),
    isGreenDay(day) &&
      events.push({
        quelle: 'gruener-tag',
        ref: day.date,
        xp: 30,
        punkte: 20,
        titel: 'Grüner Tag',
      }),
    events
  )
}
export function streakEvent(streakDays, startDate) {
  let bonus = STREAK_BONUS[streakDays]
  return bonus
    ? {
        quelle: 'streak',
        ref: `${streakDays}@${startDate}`,
        xp: bonus.xp,
        punkte: bonus.punkte,
        titel: `${streakDays} Tage am Stück`,
      }
    : null
}
export function challengeEvent(challengeId, challengeTitle, points) {
  return {
    quelle: 'challenge',
    ref: challengeId,
    xp: Math.min(500, Math.round(points * 1.5)),
    punkte: points,
    titel: challengeTitle,
  }
}
export const WELCOME_EVENT = {
  quelle: 'start',
  ref: 'willkommen',
  xp: 0,
  punkte: 50,
  titel: 'Willkommensgeschenk',
}
export const SHOP_CATEGORY_LABELS = {
  kleidung: 'Kleidung',
  kopf: 'Mützen',
  schmuck: 'Schmuck',
  tiere: 'Tiere',
}
export const SHOP_CATEGORY_SLOTS = {
  kleidung: ['kleidung'],
  kopf: ['kopf'],
  schmuck: ['brille', 'hals'],
  tiere: ['tier'],
}
export const SHOP_ITEMS = [
  {
    id: 'tank',
    name: 'Tank-Top',
    slot: 'kleidung',
    kategorie: 'kleidung',
    preis: 40,
    minLevel: 1,
    text: 'Luftig fürs Training.',
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    slot: 'kleidung',
    kategorie: 'kleidung',
    preis: 60,
    minLevel: 2,
    text: 'Gemütlich und sportlich.',
  },
  {
    id: 'jacket',
    name: 'Trainingsjacke',
    slot: 'kleidung',
    kategorie: 'kleidung',
    preis: 100,
    minLevel: 4,
    text: 'Mit Reißverschluss und Streifen.',
  },
  {
    id: 'jersey',
    name: 'Trikot',
    slot: 'kleidung',
    kategorie: 'kleidung',
    preis: 80,
    minLevel: 3,
    text: 'Für den Teamgeist.',
  },
  {
    id: 'suit',
    name: 'Anzug mit Krawatte',
    slot: 'kleidung',
    kategorie: 'kleidung',
    preis: 150,
    minLevel: 8,
    text: 'Für besondere Anlässe.',
  },
  {
    id: 'headband',
    name: 'Stirnband',
    slot: 'kopf',
    kategorie: 'kopf',
    preis: 30,
    minLevel: 1,
    text: 'Hält den Schweiß fern.',
  },
  {
    id: 'cap',
    name: 'Kappe',
    slot: 'kopf',
    kategorie: 'kopf',
    preis: 40,
    minLevel: 1,
    text: 'Der Klassiker.',
  },
  {
    id: 'beanie',
    name: 'Mütze',
    slot: 'kopf',
    kategorie: 'kopf',
    preis: 50,
    minLevel: 2,
    text: 'Warm und cool zugleich.',
  },
  {
    id: 'cowboy',
    name: 'Cowboyhut',
    slot: 'kopf',
    kategorie: 'kopf',
    preis: 120,
    minLevel: 6,
    text: 'Yeehaw!',
  },
  {
    id: 'crown',
    name: 'Krone',
    slot: 'kopf',
    kategorie: 'kopf',
    preis: 400,
    minLevel: 15,
    text: 'Für echte Champions.',
  },
  {
    id: 'glasses',
    name: 'Brille',
    slot: 'brille',
    kategorie: 'schmuck',
    preis: 50,
    minLevel: 1,
    text: 'Schlau und stylisch.',
  },
  {
    id: 'sunglasses',
    name: 'Sonnenbrille',
    slot: 'brille',
    kategorie: 'schmuck',
    preis: 70,
    minLevel: 2,
    text: 'Cool bleiben.',
  },
  {
    id: 'scarf',
    name: 'Schal',
    slot: 'hals',
    kategorie: 'schmuck',
    preis: 60,
    minLevel: 2,
    text: 'Kuschelig um den Hals.',
  },
  {
    id: 'medal',
    name: 'Medaille',
    slot: 'hals',
    kategorie: 'schmuck',
    preis: 150,
    minLevel: 5,
    text: 'Du hast sie dir verdient.',
  },
  {
    id: 'goldchain',
    name: 'Goldkette',
    slot: 'hals',
    kategorie: 'schmuck',
    preis: 200,
    minLevel: 7,
    text: 'Glänzt wie dein Fortschritt.',
  },
  {
    id: 'turtle',
    name: 'Schildkröte',
    slot: 'tier',
    kategorie: 'tiere',
    preis: 120,
    minLevel: 2,
    text: 'Langsam und stetig zum Ziel.',
  },
  {
    id: 'bunny',
    name: 'Hase',
    slot: 'tier',
    kategorie: 'tiere',
    preis: 160,
    minLevel: 3,
    text: 'Immer in Bewegung.',
  },
  {
    id: 'dog',
    name: 'Hund',
    slot: 'tier',
    kategorie: 'tiere',
    preis: 180,
    minLevel: 4,
    text: 'Dein Trainingspartner.',
  },
  {
    id: 'cat',
    name: 'Katze',
    slot: 'tier',
    kategorie: 'tiere',
    preis: 180,
    minLevel: 4,
    text: 'Gelassen und elegant.',
  },
  {
    id: 'fox',
    name: 'Fuchs',
    slot: 'tier',
    kategorie: 'tiere',
    preis: 260,
    minLevel: 9,
    text: 'Schlau und flink.',
  },
]
export function shopItemState(shopItem, ownedIds, playerLevel, balance) {
  return ownedIds.has(shopItem.id) ? 'owned' : playerLevel < shopItem.minLevel ? 'locked' : balance >= shopItem.preis ? 'buyable' : 'poor'
}
export function toggleEquipped(equippedNow, shopItem) {
  let updated = {
    ...equippedNow,
  }
  return (updated[shopItem.slot] === shopItem.id ? delete updated[shopItem.slot] : (updated[shopItem.slot] = shopItem.id), updated)
}
export const CHALLENGE_CATEGORIES = [
  {
    key: 'draussen',
    label: 'Draußen & Bewegung',
    emoji: '🌤️',
  },
  {
    key: 'koerper',
    label: 'Essen & Körper',
    emoji: '🥗',
  },
  {
    key: 'erholung',
    label: 'Schlaf & Erholung',
    emoji: '🌙',
  },
  {
    key: 'selfcare',
    label: 'Für dich selbst',
    emoji: '💚',
  },
  {
    key: 'sozial',
    label: 'Miteinander',
    emoji: '🤝',
  },
  {
    key: 'fokus',
    label: 'Kopf & Fokus',
    emoji: '🎯',
  },
]
export const challengeTemplate = (templateId, categoryKey, points, headline, description) => ({
  id: templateId,
  kategorie: categoryKey,
  punkte: points,
  titel: headline,
  text: description,
})
export const CHALLENGE_TEMPLATES = [
  challengeTemplate('frische-luft', 'draussen', 15, 'Frische Luft', 'Geh heute 20 Minuten draußen spazieren.'),
  challengeTemplate(
    'sonne-tanken',
    'draussen',
    15,
    'Sonne tanken',
    'Verbringe 15 Minuten draußen im Tageslicht, ohne Handy.',
  ),
  challengeTemplate('zehntausend', 'draussen', 25, '10.000 Schritte', 'Erreiche heute 10.000 Schritte.'),
  challengeTemplate(
    'neue-strecke',
    'draussen',
    25,
    'Neue Strecke',
    'Geh oder lauf eine Strecke, die du noch nie gegangen bist.',
  ),
  challengeTemplate('treppe', 'draussen', 10, 'Treppe statt Lift', 'Nimm heute überall die Treppe.'),
  challengeTemplate('morgenrunde', 'draussen', 15, 'Morgenrunde', 'Geh vor dem Frühstück 10 Minuten raus.'),
  challengeTemplate(
    'mittagsrunde',
    'draussen',
    15,
    'Mittagsspaziergang',
    'Mach in der Mittagspause einen Spaziergang.',
  ),
  challengeTemplate('aufs-rad', 'draussen', 20, 'Aufs Rad', 'Fahr heute mit dem Rad statt mit dem Auto oder Bus.'),
  challengeTemplate(
    'natur-moment',
    'draussen',
    15,
    'Natur-Moment',
    'Such dir draußen einen schönen Ort und mach ein Foto davon.',
  ),
  challengeTemplate('draussen-dehnen', 'draussen', 10, 'Dehnen im Freien', 'Dehne 10 Minuten, am besten draußen.'),
  challengeTemplate(
    'sonnenuntergang',
    'draussen',
    15,
    'Himmel genießen',
    'Schau dir heute den Sonnenuntergang oder Sonnenaufgang an.',
  ),
  challengeTemplate(
    'park-workout',
    'draussen',
    30,
    'Park-Workout',
    'Mach draußen 3 Runden: 10 Kniebeugen und 10 Liegestütze.',
  ),
  challengeTemplate('regenbogen', 'koerper', 20, 'Regenbogenteller', 'Iss heute Gemüse in drei verschiedenen Farben.'),
  challengeTemplate(
    'wasser-zuerst',
    'koerper',
    10,
    'Wasser zuerst',
    'Trink morgens ein großes Glas Wasser, bevor du Kaffee trinkst.',
  ),
  challengeTemplate('zuckerfrei', 'koerper', 20, 'Ohne Süßgetränke', 'Verzichte heute auf zuckerhaltige Getränke.'),
  challengeTemplate('selbst-gekocht', 'koerper', 25, 'Selbst gekocht', 'Koch heute eine Mahlzeit komplett selbst.'),
  challengeTemplate('eiweiss-frueh', 'koerper', 15, 'Eiweiß am Start', 'Iss zum Frühstück eine Eiweißquelle.'),
  challengeTemplate(
    'achtsam-essen',
    'koerper',
    20,
    'Achtsam essen',
    'Iss heute eine Mahlzeit ohne Handy und Fernseher, mit voller Aufmerksamkeit.',
  ),
  challengeTemplate(
    'neues-gemuese',
    'koerper',
    20,
    'Neues Gemüse',
    'Probiere ein Gemüse, das du lange nicht gegessen hast.',
  ),
  challengeTemplate('meal-prep', 'koerper', 30, 'Meal Prep', 'Bereite zwei Mahlzeiten für die nächsten Tage vor.'),
  challengeTemplate('obst-snack', 'koerper', 10, 'Obst als Snack', 'Ersetze heute einen Snack durch Obst.'),
  challengeTemplate('ohne-alkohol', 'koerper', 20, 'Ohne Alkohol', 'Verzichte heute auf Alkohol.'),
  challengeTemplate('zeit-fruehstueck', 'koerper', 10, 'Zeit fürs Frühstück', 'Nimm dir 15 Minuten fürs Frühstück.'),
  challengeTemplate(
    'bunte-bowl',
    'koerper',
    25,
    'Bunte Bowl',
    'Bau dir eine Bowl mit Protein, Gemüse und gesunden Fetten.',
  ),
  challengeTemplate('handy-weg', 'erholung', 20, 'Handy weg', 'Leg dein Handy 30 Minuten vor dem Schlafen weg.'),
  challengeTemplate(
    'feste-zeit',
    'erholung',
    15,
    'Feste Schlafenszeit',
    'Geh heute zur gleichen Zeit ins Bett wie gestern.',
  ),
  challengeTemplate('lueften', 'erholung', 10, 'Frische im Schlafzimmer', 'Lüfte vor dem Schlafen dein Schlafzimmer.'),
  challengeTemplate('abendritual', 'erholung', 20, 'Abendritual', 'Gönn dir 10 Minuten Ruhe: Tee, Lesen oder Dehnen.'),
  challengeTemplate('kein-koffein', 'erholung', 15, 'Kein Koffein ab Mittag', 'Trink nach 14 Uhr keinen Kaffee.'),
  challengeTemplate('acht-stunden', 'erholung', 25, 'Acht Stunden', 'Schlaf heute mindestens 8 Stunden.'),
  challengeTemplate(
    'ruhetag',
    'erholung',
    20,
    'Bewusster Ruhetag',
    'Gönn dir heute einen Erholungstag und plane etwas Entspanntes.',
  ),
  challengeTemplate('atemuebung', 'erholung', 15, 'Atemübung', 'Atme 5 Minuten ruhig: 4 Sekunden ein, 6 Sekunden aus.'),
  challengeTemplate(
    'warmes-bad',
    'erholung',
    15,
    'Warmes Bad',
    'Nimm dir Zeit für ein warmes Bad oder eine lange Dusche.',
  ),
  challengeTemplate('kurze-pause', 'erholung', 10, 'Kurze Auszeit', 'Mach 20 Minuten Pause mit geschlossenen Augen.'),
  challengeTemplate(
    'dankbarkeit',
    'selfcare',
    15,
    'Dankbarkeit',
    'Schreib drei Dinge auf, für die du heute dankbar bist.',
  ),
  challengeTemplate(
    'nur-fuer-mich',
    'selfcare',
    25,
    'Nur für mich',
    'Tu etwas Schönes nur für dich, das nichts mit Training zu tun hat.',
  ),
  challengeTemplate(
    'lieblingsmusik',
    'selfcare',
    10,
    'Lieblingsmusik',
    'Hör dein Lieblingslied und genieß es 5 Minuten lang.',
  ),
  challengeTemplate('buch', 'selfcare', 15, 'Lesezeit', 'Lies 20 Minuten in einem Buch.'),
  challengeTemplate('kreativ', 'selfcare', 20, 'Kreativ sein', 'Zeichne, schreib, koch oder bastle etwas.'),
  challengeTemplate('digital-detox', 'selfcare', 20, 'Digital Detox', 'Bleib eine Stunde ohne Social Media.'),
  challengeTemplate(
    'spiegel',
    'selfcare',
    15,
    'Stark im Spiegel',
    'Sag dir vor dem Spiegel drei Dinge, die du an dir magst.',
  ),
  challengeTemplate('stolz', 'selfcare', 15, 'Stolz-Moment', 'Schreib auf, worauf du diese Woche stolz bist.'),
  challengeTemplate(
    'aufraeumen',
    'selfcare',
    15,
    'Aufräumen',
    'Räume einen Ort auf, der dich stört: Schreibtisch, Tasche oder Schrank.',
  ),
  challengeTemplate(
    'neues-lernen',
    'selfcare',
    15,
    'Etwas Neues lernen',
    'Lerne ein neues Wort, ein Rezept oder einen spannenden Fakt.',
  ),
  challengeTemplate(
    'wohlfuehl-outfit',
    'selfcare',
    10,
    'Wohlfühl-Outfit',
    'Zieh heute etwas an, in dem du dich richtig wohlfühlst.',
  ),
  challengeTemplate('ziel-morgen', 'selfcare', 10, 'Ziel für morgen', 'Schreib ein kleines Ziel für morgen auf.'),
  challengeTemplate('bildschirmpause', 'selfcare', 10, 'Bildschirmpause', 'Mach 15 Minuten Pause ohne Bildschirm.'),
  challengeTemplate(
    'laecheln',
    'selfcare',
    10,
    'Lächeln verschenken',
    'Schenk heute drei Menschen ein ehrliches Lächeln.',
  ),
  challengeTemplate(
    'nachricht',
    'sozial',
    15,
    'Liebe Nachricht',
    'Schreib einer Person, die dir wichtig ist, eine liebe Nachricht.',
  ),
  challengeTemplate('gemeinsam-bewegen', 'sozial', 25, 'Gemeinsam bewegen', 'Beweg dich heute zusammen mit jemandem.'),
  challengeTemplate('gefallen', 'sozial', 20, 'Kleiner Gefallen', 'Tu jemandem heute einen kleinen Gefallen.'),
  challengeTemplate('anrufen', 'sozial', 20, 'Anrufen', 'Ruf jemanden an, den du länger nicht gehört hast.'),
  challengeTemplate('gemeinsam-essen', 'sozial', 25, 'Gemeinsam essen', 'Koch oder iss heute mit anderen zusammen.'),
  challengeTemplate('danke-sagen', 'sozial', 15, 'Danke sagen', 'Bedank dich heute bei jemandem ganz bewusst.'),
  challengeTemplate(
    'hilfe-holen',
    'sozial',
    20,
    'Um Rat fragen',
    'Frag jemanden um Rat oder Unterstützung bei etwas, das dir schwerfällt.',
  ),
  challengeTemplate(
    'coach-update',
    'sozial',
    20,
    'Update an den Coach',
    'Schreib deinem Coach, wie es dir diese Woche geht.',
  ),
  challengeTemplate(
    'frosch',
    'fokus',
    25,
    'Der Frosch zuerst',
    'Erledige heute zuerst die Aufgabe, die du gern aufschiebst.',
  ),
  challengeTemplate('wochenplan', 'fokus', 20, 'Wochenplan', 'Plane deine Trainingswoche im Kalender.'),
  challengeTemplate('meditation', 'fokus', 15, 'Fünf Minuten Ruhe', 'Meditiere 5 Minuten, zum Beispiel mit einer App.'),
  challengeTemplate(
    'reflexion',
    'fokus',
    20,
    'Reflexion',
    'Schreib auf, was diese Woche gut lief und was du ändern willst.',
  ),
  challengeTemplate(
    'fokuszeit',
    'fokus',
    20,
    'Fokuszeit',
    'Arbeite 25 Minuten konzentriert an einer Sache, ohne Ablenkung.',
  ),
  challengeTemplate(
    'rueckblick',
    'fokus',
    15,
    'Fortschritt ansehen',
    'Schau dir deine Zahlen oder Fotos der letzten Wochen an.',
  ),
]
export const findChallengeTemplate = (templateId) => CHALLENGE_TEMPLATES.find((template) => template.id === templateId)
export function isoWeek(dateISO) {
  let weekDate = new Date(`${dateISO}T00:00:00Z`),
    weekday = (weekDate.getUTCDay() + 6) % 7
  weekDate.setUTCDate(weekDate.getUTCDate() - weekday + 3)
  let jan4 = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 4)),
    weekNumber = 1 + Math.round(((weekDate.getTime() - jan4.getTime()) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7)
  return `${weekDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}
export function dailyChallengeSuggestions(seed, excludedIds) {
  let state = 0
  for (let seedChar of seed) state = (state * 31 + seedChar.charCodeAt(0)) >>> 0
  let nextRandom = () => ((state = (state * 1664525 + 1013904223) >>> 0), state / 4294967296),
    categoryKeys = CHALLENGE_CATEGORIES.map((category) => category.key)
  for (let position = categoryKeys.length - 1; position > 0; position--) {
    let swapIndex = Math.floor(nextRandom() * (position + 1))
    ;[categoryKeys[position], categoryKeys[swapIndex]] = [categoryKeys[swapIndex], categoryKeys[position]]
  }
  let picked = []
  for (let categoryName of categoryKeys) {
    let candidates = CHALLENGE_TEMPLATES.filter((candidate) => candidate.kategorie === categoryName && !excludedIds.has(candidate.id))
    if ((candidates.length && picked.push(candidates[Math.floor(nextRandom() * candidates.length)]), picked.length === 3)) break
  }
  return picked
}
export const REWARD_IDEAS = [
  {
    titel: 'Eine Kugel Eis',
    preis: 80,
    emoji: '🍦',
  },
  {
    titel: 'Ein Stück Kuchen',
    preis: 100,
    emoji: '🍰',
  },
  {
    titel: '30 Minuten mehr Bildschirmzeit',
    preis: 60,
    emoji: '📱',
  },
  {
    titel: 'Eine Serienfolge am Abend',
    preis: 50,
    emoji: '📺',
  },
  {
    titel: 'Am Wochenende ausschlafen',
    preis: 120,
    emoji: '😴',
  },
  {
    titel: 'Ein freier Abend ohne Plan',
    preis: 150,
    emoji: '🌇',
  },
  {
    titel: 'Pizza-Abend',
    preis: 200,
    emoji: '🍕',
  },
  {
    titel: 'Neue Trainings-Playlist',
    preis: 70,
    emoji: '🎧',
  },
  {
    titel: 'Kino-Abend',
    preis: 250,
    emoji: '🎬',
  },
  {
    titel: 'Lieblingsessen im Restaurant',
    preis: 350,
    emoji: '🍽️',
  },
  {
    titel: 'Massage oder Sauna',
    preis: 300,
    emoji: '💆',
  },
  {
    titel: 'Neues Sportoutfit',
    preis: 600,
    emoji: '👟',
  },
]
export function normalizeCharacterName(rawName) {
  return rawName.replace(/\s+/g, ' ').trim().slice(0, 16)
}
export const SKIN_COLORS = ['#FAD9C1', '#F2C29B', '#E0A370', '#C68642', '#8D5524', '#5C3A21']
export const HAIR_COLORS = ['#1D1B1A', '#3B2A20', '#6B4423', '#9A4A22', '#D9B25F', '#A3A3A3', '#C4461F', '#EDEDED']
export const SHIRT_COLORS = ['#075640', '#2A80D6', '#C4461F', '#6B4FC8', '#1D1B1A', '#E0A526']
export const FACE_SHAPES = [
  {
    key: 'round',
    label: 'Rund',
  },
  {
    key: 'oval',
    label: 'Oval',
  },
  {
    key: 'square',
    label: 'Eckig',
  },
]
export const HAIR_STYLES = [
  {
    key: 'short',
    label: 'Kurz',
  },
  {
    key: 'buzz',
    label: 'Millimeter',
  },
  {
    key: 'side',
    label: 'Seitenscheitel',
  },
  {
    key: 'curly',
    label: 'Locken',
  },
  {
    key: 'long',
    label: 'Lang',
  },
  {
    key: 'ponytail',
    label: 'Zopf',
  },
  {
    key: 'bun',
    label: 'Dutt',
  },
  {
    key: 'bald',
    label: 'Glatze',
  },
]
export const EYE_STYLES = [
  {
    key: 'round',
    label: 'Rund',
  },
  {
    key: 'happy',
    label: 'Fröhlich',
  },
  {
    key: 'wide',
    label: 'Wach',
  },
  {
    key: 'calm',
    label: 'Ruhig',
  },
]
export const BROW_STYLES = [
  {
    key: 'soft',
    label: 'Weich',
  },
  {
    key: 'strong',
    label: 'Kräftig',
  },
  {
    key: 'thin',
    label: 'Fein',
  },
]
export const MOUTH_STYLES = [
  {
    key: 'smile',
    label: 'Lächeln',
  },
  {
    key: 'grin',
    label: 'Grinsen',
  },
  {
    key: 'soft',
    label: 'Sanft',
  },
  {
    key: 'open',
    label: 'Offen',
  },
]
export const BEARD_STYLES = [
  {
    key: 'none',
    label: 'Kein Bart',
  },
  {
    key: 'stubble',
    label: 'Dreitagebart',
  },
  {
    key: 'mustache',
    label: 'Schnurrbart',
  },
  {
    key: 'short',
    label: 'Kurzbart',
  },
  {
    key: 'full',
    label: 'Vollbart',
  },
]
export const DEFAULT_CHARACTER = {
  skin: SKIN_COLORS[1],
  face: 'round',
  hairStyle: 'short',
  hairColor: HAIR_COLORS[1],
  eyes: 'round',
  brows: 'soft',
  mouth: 'smile',
  beard: 'none',
  shirt: SHIRT_COLORS[0],
}
export function shade(hex, amount = 0.14) {
  let colorValue = parseInt(hex.slice(1), 16),
    darken = (channel) => Math.max(0, Math.round(channel * (1 - amount))),
    red = darken((colorValue >> 16) & 255),
    green = darken((colorValue >> 8) & 255),
    blue = darken(colorValue & 255)
  return `#${((1 << 24) | (red << 16) | (green << 8) | blue).toString(16).slice(1)}`
}
export const RANDOM_NAMES = [
  'Hugo',
  'Pia',
  'Max',
  'Luna',
  'Finn',
  'Mila',
  'Leo',
  'Nova',
  'Rocky',
  'Sunny',
  'Emil',
  'Ida',
  'Bruno',
  'Zoe',
  'Jonas',
  'Lotta',
]
export const pick = (list) => list[Math.floor(Math.random() * list.length)]
export function randomCharacterConfig() {
  return {
    skin: pick(SKIN_COLORS),
    face: pick(FACE_SHAPES).key,
    hairStyle: pick(HAIR_STYLES).key,
    hairColor: pick(HAIR_COLORS),
    eyes: pick(EYE_STYLES).key,
    brows: pick(BROW_STYLES).key,
    mouth: pick(MOUTH_STYLES).key,
    beard: Math.random() < 0.7 ? 'none' : pick(BEARD_STYLES).key,
    shirt: pick(SHIRT_COLORS),
  }
}
