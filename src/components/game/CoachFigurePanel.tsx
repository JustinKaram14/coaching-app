// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useAuth } from '../../hooks/useAuth'
import { useCallback, useEffect, useState } from 'react'
import { fetchChallenges } from '../../lib/challenges'
import { Spinner } from '../ui/Spinner'
import { levelInfo, levelTitle } from '../../lib/game'
import { supabase } from '../../lib/supabase'
import { Avatar } from './Avatar'
import { Check, Clock, Coins, Plus, Star, Trash2, Trophy } from 'lucide-react'
import { cn, formatDate, todayISO } from '../../lib/utils'
import { ProofImage } from './ProofImage'

export function CoachFigurePanel({ clientId, clientName, game }) {
  let { user } = useAuth(),
    [challenges, setChallenges] = useState(null),
    [form, setForm] = useState({
      titel: '',
      beschreibung: '',
      punkte: '25',
      frist: '',
    }),
    [sending, setSending] = useState(false),
    [error, setError] = useState(null),
    reload = useCallback(async () => {
      setChallenges(((await fetchChallenges(clientId)) ?? []).filter((challenge) => challenge.coach_id === user?.id))
    }, [clientId, user?.id])
  if (
    (useEffect(() => {
      game.available && reload()
    }, [game.available, reload]),
    !game.loaded)
  )
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  if (!game.available)
    return (
      <p className="card text-sm text-text-secondary">
        Die Figuren sind noch nicht eingerichtet (Datenbank-Update fehlt).
      </p>
    )
  let levelData = levelInfo(game.xp),
    points = Math.round(Number(form.punkte)),
    valid = form.titel.trim().length >= 2 && points >= 5 && points <= 100
  async function send() {
    if (!user || !valid || sending) return
    ;(setSending(true), setError(null))
    let { error: insertError } = await supabase.from('challenges').insert({
      user_id: clientId,
      coach_id: user.id,
      titel: form.titel.trim(),
      beschreibung: form.beschreibung.trim() || null,
      punkte: points,
      frist: form.frist || null,
    })
    if ((setSending(false), insertError)) {
      setError('Das hat nicht geklappt. Versuche es noch einmal.')
      return
    }
    ;(setForm({
      titel: '',
      beschreibung: '',
      punkte: '25',
      frist: '',
    }),
      await reload())
  }
  async function withdraw(challenge) {
    ;(await supabase.from('challenges').delete().eq('id', challenge.id), await reload())
  }
  let open = (challenges ?? []).filter((challenge) => challenge.status === 'aktiv'),
    done = (challenges ?? []).filter((challenge) => challenge.status === 'erledigt'),
    intro = game.kennenlernen
  return (
    <div className="space-y-5">
      <div className="card flex items-center gap-5">
        {game.name ? (
          <>
            <div className="relative shrink-0">
              <Avatar
                config={game.config}
                equipped={game.equipped}
                size={120}
                idle
                label={`${game.name}, Level ${levelData.level}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-extrabold text-text-primary truncate">{game.name}</div>
              <div className="text-sm font-semibold text-brand">
                Level {levelData.level} · {levelTitle(levelData.level)}
              </div>
              <div
                className="mt-2 h-2.5 rounded-full bg-bg-elevated overflow-hidden max-w-xs"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={levelData.xpNeed}
                aria-valuenow={levelData.xpInto}
                aria-label="Fortschritt zum nächsten Level"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-brand"
                  style={{
                    width: `${Math.max(4, levelData.pct)}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold tabular-nums text-text-secondary">
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="text-warning" aria-hidden="true" /> {game.xp} XP
                </span>
                <span className="inline-flex items-center gap-1">
                  <Coins size={12} className="text-warning" aria-hidden="true" /> {game.punkte} Punkte
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-text-secondary">{clientName} hat noch keine Figur erstellt.</p>
        )}
      </div>
      {intro && (
        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Kennenlernen</h3>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-text-muted">Ansprache</dt>
              <dd className="text-text-primary font-medium">{intro.anrede || '–'}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Ziele</dt>
              <dd className="text-text-primary font-medium">{intro.ziele?.join(', ') || '–'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-text-muted">Warum</dt>
              <dd className="text-text-primary">{intro.warum || '–'}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Erfahrung</dt>
              <dd className="text-text-primary font-medium">{intro.erfahrung || '–'}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Zeit</dt>
              <dd className="text-text-primary font-medium">{intro.zeit || '–'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-text-muted">Fällt schwer</dt>
              <dd className="text-text-primary font-medium">{intro.schwierigkeiten?.join(', ') || '–'}</dd>
            </div>
          </dl>
        </div>
      )}
      <div className="card space-y-4">
        <div>
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Trophy size={15} className="text-warning" aria-hidden="true" /> Challenge für {clientName} setzen
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Bei deinen Challenges siehst du den Nachweis (Foto oder Notiz). Die eigenen Challenges deines Klienten
            bleiben privat.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ch-titel">
              Titel
            </label>
            <input
              id="ch-titel"
              className="input"
              maxLength={120}
              value={form.titel}
              onChange={(event) =>
                setForm({
                  ...form,
                  titel: event.target.value,
                })
              }
              placeholder="z. B. 3 × diese Woche Spazieren gehen"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ch-text">
              Beschreibung (freiwillig)
            </label>
            <textarea
              id="ch-text"
              className="input min-h-[72px]"
              maxLength={300}
              value={form.beschreibung}
              onChange={(event) =>
                setForm({
                  ...form,
                  beschreibung: event.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="ch-punkte">
              Punkte (5 bis 100)
            </label>
            <input
              id="ch-punkte"
              className="input tabular-nums"
              type="number"
              min={5}
              max={100}
              step={5}
              value={form.punkte}
              onChange={(event) =>
                setForm({
                  ...form,
                  punkte: event.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="ch-frist">
              Frist (freiwillig)
            </label>
            <input
              id="ch-frist"
              className="input"
              type="date"
              min={todayISO()}
              value={form.frist}
              onChange={(event) =>
                setForm({
                  ...form,
                  frist: event.target.value,
                })
              }
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button
          onClick={send}
          disabled={!valid || sending}
          className="btn-primary disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={16} aria-hidden="true" /> Challenge senden
        </button>
      </div>
      <div className="card space-y-3">
        <h3 className="text-sm font-bold text-text-primary">Deine Challenges</h3>
        {challenges === null && <Spinner />}
        {challenges !== null && challenges.length === 0 && (
          <p className="text-sm text-text-secondary">Noch keine gesetzt.</p>
        )}
        {open.map((challenge) => (
          <div className="flex items-center gap-3 rounded-2xl bg-bg-elevated px-3.5 py-3" key={challenge.id}>
            <Clock size={16} className="text-text-secondary shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-text-primary truncate">{challenge.titel}</div>
              <div className="text-xs text-text-secondary">
                Offen · {challenge.punkte} Punkte{challenge.frist ? ` · bis ${formatDate(challenge.frist, 'dd.MM.')}` : ''}
              </div>
            </div>
            <button
              onClick={() => withdraw(challenge)}
              aria-label={`${challenge.titel} zurückziehen`}
              className="p-2 rounded-full text-text-secondary hover:text-danger transition-colors"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        {done.map((challenge) => (
          <div
            className={cn('flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 px-3.5 py-3')}
            key={challenge.id}
          >
            <span className="w-8 h-8 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
              <Check size={16} strokeWidth={3} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-text-primary">{challenge.titel}</div>
              <div className="text-xs text-text-secondary">
                Geschafft{challenge.erledigt_am ? ` am ${formatDate(challenge.erledigt_am, 'dd.MM.yyyy')}` : ''} · {challenge.punkte} Punkte
              </div>
              {challenge.nachweis_text && <p className="text-sm text-text-primary mt-1.5">„{challenge.nachweis_text}“</p>}
            </div>
            {challenge.nachweis_pfad && <ProofImage path={challenge.nachweis_pfad} />}
          </div>
        ))}
      </div>
    </div>
  )
}
