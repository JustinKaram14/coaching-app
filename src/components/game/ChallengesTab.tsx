// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_TEMPLATES,
  challengeEvent,
  dailyChallengeSuggestions,
  findChallengeTemplate,
} from '../../lib/game'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createdTodayCount, fetchChallenges, proofUrl, uploadProof, weekCompletedTemplates } from '../../lib/challenges'
import { useAuth } from '../../hooks/useAuth'
import { useGame } from '../../hooks/useGame'
import { cn, formatDate, todayISO } from '../../lib/utils'
import { supabase } from '../../lib/supabase'
import { Camera, Check, ChevronDown, Coins, Flag, ListChecks, Play, Sparkles, Trash2, UserCheck, X } from 'lucide-react'
import { Spinner } from '../ui/Spinner'
import { BottomSheet } from '../ui/BottomSheet'

export const categoryEmoji = (categoryKey) => CHALLENGE_CATEGORIES.find((entry) => entry.key === categoryKey)?.emoji ?? '⭐'
export function ProofThumb({ path }) {
  let [url, setUrl] = useState(null)
  return (
    useEffect(() => {
      let cancelled = false
      return (
        proofUrl(path).then((signedUrl) => {
          cancelled || setUrl(signedUrl)
        }),
        () => {
          cancelled = true
        }
      )
    }, [path]),
    url ? (
      <img
        src={url}
        alt="Dein Nachweis"
        className="w-14 h-14 rounded-2xl object-cover border border-border shrink-0"
        loading="lazy"
      />
    ) : null
  )
}
export function ChallengesTab() {
  let { user } = useAuth(),
    { award, stats } = useGame(),
    [challenges, setChallenges] = useState(null),
    [unavailable, setUnavailable] = useState(false),
    [busyId, setBusyId] = useState(null),
    [allOpen, setAllOpen] = useState(false),
    [finishing, setFinishing] = useState(null),
    [doneOpen, setDoneOpen] = useState(false),
    [notice, setNotice] = useState(null),
    [justDoneId, setJustDoneId] = useState(null),
    today = todayISO(),
    reload = useCallback(async () => {
      if (!user) return
      let fetched = await fetchChallenges(user.id)
      fetched === null ? setUnavailable(true) : (setChallenges(fetched), setUnavailable(false))
    }, [user])
  useEffect(() => {
    reload()
  }, [reload])
  let all = challenges ?? [],
    weekDone = useMemo(() => weekCompletedTemplates(all, today), [all, today]),
    active = all.filter((challenge) => challenge.status === 'aktiv'),
    activeTemplateIds = new Set(active.map((challenge) => challenge.vorlage_id).filter(Boolean)),
    fromCoach = active.filter((challenge) => challenge.coach_id),
    own = active.filter((challenge) => !challenge.coach_id),
    done = all.filter((challenge) => challenge.status === 'erledigt'),
    createdToday = createdTodayCount(all, today),
    startsLeft = Math.max(0, 3 - createdToday),
    suggestions = useMemo(
      () => dailyChallengeSuggestions(today, new Set([...weekDone, ...activeTemplateIds])),
      [today, weekDone, active.length],
    )
  async function start(template) {
    if (!user || busyId) return
    if (startsLeft <= 0) {
      setNotice('Heute sind 3 Challenges genug. Morgen gibt es neue.')
      return
    }
    ;(setBusyId(template.id), setNotice(null))
    let { error: insertError } = await supabase.from('challenges').insert({
      user_id: user.id,
      vorlage_id: template.id,
      titel: template.titel,
      beschreibung: template.text,
      kategorie: template.kategorie,
      punkte: template.punkte,
    })
    if ((setBusyId(null), insertError)) {
      setNotice('Das hat nicht geklappt. Versuche es noch einmal.')
      return
    }
    await reload()
  }
  async function drop(challenge) {
    ;(setBusyId(challenge.id), await supabase.from('challenges').delete().eq('id', challenge.id), setBusyId(null), await reload())
  }
  async function finish(challengeRow, noteText, photoFile) {
    if (!user) return 'Nicht angemeldet'
    let proofPath = null
    if (photoFile && ((proofPath = await uploadProof(user.id, challengeRow.id, photoFile)), !proofPath))
      return 'Das Foto konnte nicht hochgeladen werden. Versuche es noch einmal oder schreib eine Notiz.'
    let stillActive = await supabase.from('challenges').select('id').eq('id', challengeRow.id).eq('status', 'aktiv')
    if (stillActive.error) return 'Das hat nicht geklappt. Versuche es noch einmal.'
    if (!(stillActive.data ?? []).length) return (await reload(), 'Diese Challenge läuft nicht mehr.')
    if ((await award([challengeEvent(challengeRow.id, challengeRow.titel, challengeRow.punkte)])) === null)
      return 'Die Punkte konnten nicht gutgeschrieben werden. Versuche es noch einmal.'
    let { error: updateError } = await supabase
      .from('challenges')
      .update({
        status: 'erledigt',
        nachweis_text: noteText.trim() || null,
        nachweis_pfad: proofPath,
        erledigt_am: new Date().toISOString(),
      })
      .eq('id', challengeRow.id)
      .eq('status', 'aktiv')
    return updateError
      ? 'Das hat nicht geklappt. Versuche es noch einmal.'
      : (setJustDoneId(challengeRow.id), window.setTimeout(() => setJustDoneId(null), 1400), await reload(), null)
  }
  return unavailable ? (
    <p className="card text-sm text-text-secondary">
      Die Challenges sind noch nicht eingerichtet. Bitte später noch einmal versuchen.
    </p>
  ) : challenges ? (
    <div className="space-y-5">
      {notice && (
        <p
          role="status"
          className="text-sm rounded-2xl px-4 py-2.5 border text-warning bg-warning/10 border-warning/30"
        >
          {notice}
        </p>
      )}
      {fromCoach.length > 0 && (
        <section aria-label="Aufgaben von deinem Coach" className="space-y-2">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase flex items-center gap-1.5">
            <UserCheck size={13} aria-hidden="true" /> Von deinem Coach
          </h3>
          {fromCoach.map((challenge, position) => (
            <ChallengeCard
              row={challenge}
              index={position}
              coach
              done={justDoneId === challenge.id}
              busy={busyId === challenge.id}
              onFinish={() => setFinishing(challenge)}
              key={challenge.id}
            />
          ))}
        </section>
      )}
      {own.length > 0 && (
        <section aria-label="Deine laufenden Challenges" className="space-y-2">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase flex items-center gap-1.5">
            <Flag size={13} aria-hidden="true" /> Läuft gerade
          </h3>
          {own.map((challenge, position) => (
            <ChallengeCard
              row={challenge}
              index={position}
              done={justDoneId === challenge.id}
              busy={busyId === challenge.id}
              onFinish={() => setFinishing(challenge)}
              onDrop={() => drop(challenge)}
              key={challenge.id}
            />
          ))}
        </section>
      )}
      <section aria-label="Vorschläge für heute" className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase flex items-center gap-1.5">
            <Sparkles size={13} aria-hidden="true" /> Für heute
          </h3>
          <span className="text-xs text-text-secondary tabular-nums" aria-live="polite">
            {startsLeft > 0 ? `Noch ${startsLeft} von 3 frei` : 'Heute ist genug'}
          </span>
        </div>
        {suggestions.length === 0 && (
          <p className="card text-sm text-text-secondary">Für heute gibt es keine neuen Vorschläge mehr. Stark!</p>
        )}
        {suggestions.map((suggestion, position) => (
          <div
            className="enter card !p-4 flex items-center gap-3"
            style={{
              '--d': 40 + position * 60,
            }}
            key={suggestion.id}
          >
            <span
              className="w-11 h-11 rounded-2xl bg-brand/10 flex items-center justify-center text-xl shrink-0"
              aria-hidden="true"
            >
              {categoryEmoji(suggestion.kategorie)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-text-primary text-sm">{suggestion.titel}</div>
              <div className="text-xs text-text-secondary leading-snug">{suggestion.text}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-warning tabular-nums">
                <Coins size={12} aria-hidden="true" /> {suggestion.punkte} Punkte
              </div>
            </div>
            <button
              onClick={() => start(suggestion)}
              disabled={busyId === suggestion.id || startsLeft <= 0}
              className="btn-primary !px-4 !py-2 text-sm shrink-0 disabled:opacity-50 flex items-center gap-1.5"
              aria-label={`${suggestion.titel} starten`}
            >
              <Play size={14} aria-hidden="true" /> Start
            </button>
          </div>
        ))}
        <button
          onClick={() => setAllOpen(true)}
          className="w-full btn-secondary !py-2.5 text-sm flex items-center justify-center gap-2"
        >
          <ListChecks size={16} aria-hidden="true" /> Alle Challenges ansehen
        </button>
      </section>
      {done.length > 0 && (
        <section aria-label="Erledigte Challenges">
          <button
            onClick={() => setDoneOpen((wasOpen) => !wasOpen)}
            aria-expanded={doneOpen}
            className="w-full flex items-center justify-between text-xs font-bold tracking-wider text-text-secondary uppercase py-3"
          >
            <span className="flex items-center gap-1.5">
              <Check size={13} aria-hidden="true" /> Geschafft ({done.length})
            </span>
            <ChevronDown
              size={16}
              className={cn('transition-transform duration-300', doneOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
          {doneOpen && (
            <ul className="space-y-2 mt-2">
              {done.slice(0, 20).map((challenge, position) => (
                <li
                  className="enter card !p-3 flex items-center gap-3"
                  style={{
                    '--d': position * 30,
                  }}
                  key={challenge.id}
                >
                  {challenge.nachweis_pfad ? (
                    <ProofThumb path={challenge.nachweis_pfad} />
                  ) : (
                    <span className="w-11 h-11 rounded-2xl bg-success/15 text-success flex items-center justify-center shrink-0">
                      <Check size={20} strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-text-primary text-sm truncate">{challenge.titel}</div>
                    <div className="text-xs text-text-secondary truncate">
                      {challenge.erledigt_am ? formatDate(challenge.erledigt_am, 'dd.MM.yyyy') : ''}
                      {challenge.nachweis_text ? ` · ${challenge.nachweis_text}` : ''}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-warning tabular-nums shrink-0">+{challenge.punkte}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <AllChallengesSheet
        open={allOpen}
        onClose={() => setAllOpen(false)}
        weekDone={weekDone}
        activeIds={activeTemplateIds}
        left={startsLeft}
        busy={busyId}
        onStart={async (template) => {
          await start(template)
        }}
      />
      <FinishChallengeSheet
        row={finishing}
        onClose={() => setFinishing(null)}
        onFinish={finish}
        points={stats.punkte}
      />
    </div>
  ) : (
    <div className="flex justify-center py-10">
      <Spinner />
    </div>
  )
}
export function ChallengeCard({ row, index, coach, done, busy, onFinish, onDrop }) {
  let overdue = !!row.frist && row.frist < todayISO()
  return (
    <div
      className={cn('enter card !p-4 space-y-3', coach && 'border-brand/40', done && 'pop-in')}
      style={{
        '--d': 30 + index * 60,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-11 h-11 rounded-2xl bg-brand/10 flex items-center justify-center text-xl shrink-0"
          aria-hidden="true"
        >
          {coach ? '🏅' : categoryEmoji(row.kategorie)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-text-primary text-sm">{row.titel}</div>
          {row.beschreibung && (
            <div className="text-xs text-text-secondary leading-snug mt-0.5">{row.beschreibung}</div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-warning tabular-nums">
              <Coins size={12} aria-hidden="true" /> {row.punkte} Punkte
            </span>
            {row.frist && (
              <span className={cn('font-semibold', overdue ? 'text-danger' : 'text-text-secondary')}>
                {overdue ? 'Frist vorbei: ' : 'Bis '}
                {formatDate(row.frist, 'dd.MM.')}
              </span>
            )}
          </div>
          {coach && <p className="text-xs text-text-secondary mt-1.5">Dein Coach sieht deinen Nachweis.</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onFinish}
          disabled={busy}
          className="btn-primary flex-1 !py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Check size={16} aria-hidden="true" /> Erledigt
        </button>
        {onDrop && (
          <button
            onClick={onDrop}
            disabled={busy}
            aria-label={`${row.titel} abbrechen`}
            className="w-12 rounded-2xl bg-bg-elevated border border-border-input text-text-secondary hover:text-danger hover:border-danger/50 flex items-center justify-center transition-colors"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
export function FinishChallengeSheet({ row, onClose, onFinish, points }) {
  let [note, setNote] = useState(''),
    [photo, setPhoto] = useState(null),
    [preview, setPreview] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    lastRow = useRef(null)
  row && (lastRow.current = row)
  let shown = row ?? lastRow.current
  ;(useEffect(() => {
    row && (setNote(''), setPhoto(null), setError(null), setBusy(false))
  }, [row?.id]),
    useEffect(() => {
      if (!photo) {
        setPreview(null)
        return
      }
      let previewUrl = URL.createObjectURL(photo)
      return (setPreview(previewUrl), () => URL.revokeObjectURL(previewUrl))
    }, [photo]))
  let canSubmit = !!photo || note.trim().length >= 3
  async function submit() {
    if (!row || !canSubmit || busy) return
    ;(setBusy(true), setError(null))
    let finishError = await onFinish(row, note, photo)
    if ((setBusy(false), finishError)) {
      setError(finishError)
      return
    }
    onClose()
  }
  return (
    <BottomSheet open={!!row} onClose={onClose} title="Geschafft? Zeig es kurz">
      {shown && (
        <div className="space-y-4 pb-3">
          <div className="card !p-3 flex items-center gap-3 bg-bg-elevated">
            <span className="text-xl" aria-hidden="true">
              {shown.coach_id ? '🏅' : categoryEmoji(shown.kategorie)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-text-primary text-sm">{shown.titel}</div>
              <div className="text-xs text-warning font-semibold tabular-nums">
                +{shown.punkte} Punkte · du hast {points}
              </div>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="proof-note">
              Kurze Notiz
            </label>
            <textarea
              id="proof-note"
              className="input min-h-[84px]"
              maxLength={200}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Was hast du gemacht? Wie hat es sich angefühlt?"
            />
          </div>
          <div>
            <div className="label">Oder ein Foto</div>
            {preview ? (
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Vorschau deines Nachweises"
                  className="h-40 rounded-3xl object-cover border border-border"
                />
                <button
                  onClick={() => setPhoto(null)}
                  aria-label="Foto entfernen"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="btn-secondary !py-2.5 text-sm flex items-center justify-center gap-2 cursor-pointer">
                <Camera size={16} aria-hidden="true" /> Foto aufnehmen oder wählen
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Nachweis-Foto"
                  onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {shown.coach_id
              ? 'Diese Challenge hat dir dein Coach gesetzt, deshalb sieht er deinen Nachweis.'
              : 'Dein Nachweis bleibt privat. Nur du siehst ihn, auch dein Coach nicht.'}
          </p>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button
            onClick={submit}
            disabled={!canSubmit || busy}
            className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Spinner size={16} className="text-white" /> : <Check size={18} aria-hidden="true" />} Punkte
            abholen
          </button>
          {!canSubmit && (
            <p className="text-xs text-text-muted text-center -mt-2">
              Eine Notiz (mindestens 3 Zeichen) oder ein Foto reicht.
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
export function AllChallengesSheet({ open, onClose, weekDone, activeIds, left, busy, onStart }) {
  let [category, setCategory] = useState('draussen'),
    list = CHALLENGE_TEMPLATES.filter((template) => template.kategorie === category)
  return (
    <BottomSheet open={open} onClose={onClose} title="Alle Challenges" tall>
      <div className="space-y-3 pb-3">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1" role="group" aria-label="Bereich">
          {CHALLENGE_CATEGORIES.map((categoryItem) => (
            <button
              onClick={() => setCategory(categoryItem.key)}
              aria-pressed={category === categoryItem.key}
              className={cn(
                'shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95',
                category === categoryItem.key
                  ? 'bg-primary text-white border-brand'
                  : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary',
              )}
              key={categoryItem.key}
            >
              <span aria-hidden="true">{categoryItem.emoji}</span> {categoryItem.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-secondary">
          {left > 0 ? `Heute kannst du noch ${left} starten.` : 'Heute sind es schon drei. Morgen geht es weiter.'} Jede
          Challenge zählt einmal pro Woche.
        </p>
        <ul className="space-y-2" key={category}>
          {list.map((template, position) => {
            let isActive = activeIds.has(template.id),
              doneThisWeek = weekDone.has(template.id),
              isDisabled = isActive || doneThisWeek || left <= 0 || busy === template.id
            return (
              <li
                className="enter card !p-3 flex items-center gap-3"
                style={{
                  '--d': position * 28,
                }}
                key={template.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-text-primary text-sm">{template.titel}</div>
                  <div className="text-xs text-text-secondary leading-snug">{findChallengeTemplate(template.id)?.text}</div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-warning tabular-nums">
                    <Coins size={11} aria-hidden="true" /> {template.punkte}
                  </div>
                </div>
                <button
                  onClick={() => void onStart(template)}
                  disabled={isDisabled}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold border transition-all active:scale-95',
                    isDisabled ? 'bg-bg-elevated text-text-muted border-border' : 'bg-primary text-white border-brand',
                  )}
                  aria-label={`${template.titel} starten`}
                >
                  {isActive ? 'Läuft' : doneThisWeek ? 'Diese Woche geschafft' : 'Start'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </BottomSheet>
  )
}
