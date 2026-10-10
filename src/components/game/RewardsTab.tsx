// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useAuth } from '../../hooks/useAuth'
import { useGame } from '../../hooks/useGame'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../ui/Spinner'
import { REWARD_IDEAS } from '../../lib/game'
import { Check, Coins, Gift, Pencil, Plus, Ticket, Trash2 } from 'lucide-react'
import { cn, formatDate } from '../../lib/utils'
import { BottomSheet } from '../ui/BottomSheet'

export const REWARD_EMOJIS = ['🍦', '🍰', '🍕', '📱', '📺', '🎧', '🎬', '😴', '🍽️', '💆', '👟', '🎁']
export function RewardsTab() {
  let { user } = useAuth(),
    { stats, redeemReward } = useGame(),
    [rewards, setRewards] = useState(null),
    [redemptions, setRedemptions] = useState([]),
    [unavailable, setUnavailable] = useState(false),
    [editTarget, setEditTarget] = useState(null),
    [notice, setNotice] = useState(null),
    [redeemingId, setRedeemingId] = useState(null),
    [newVoucherId, setNewVoucherId] = useState(null),
    [addingIdea, setAddingIdea] = useState(false),
    reload = useCallback(async () => {
      if (!user) return
      let [t, n] = await Promise.all([
        supabase.from('belohnungen').select('id,titel,preis,emoji').eq('user_id', user.id).order('preis', {
          ascending: true,
        }),
        supabase
          .from('einloesungen')
          .select('*')
          .eq('user_id', user.id)
          .order('eingeloest_am', {
            ascending: false,
          })
          .limit(60),
      ])
      if (t.error) {
        setUnavailable(true)
        return
      }
      ;(setUnavailable(false), setRewards(t.data ?? []), setRedemptions((n.error ? [] : n.data) ?? []))
    }, [user])
  useEffect(() => {
    reload()
  }, [reload])
  async function redeem(t) {
    if (!user || redeemingId) return
    ;(setRedeemingId(t.id), setNotice(null))
    let r = await redeemReward(t)
    if (r.error) {
      ;(setRedeemingId(null),
        setNotice({
          tone: 'warn',
          text: r.error,
        }))
      return
    }
    let i = r.id
    ;(setRedeemingId(null),
      setNewVoucherId(i),
      window.setTimeout(() => setNewVoucherId(null), 1200),
      setNotice({
        tone: 'ok',
        text: `„${t.titel}“ ist jetzt dein Gutschein. Genieß es!`,
      }),
      await reload())
  }
  async function markUsed(e) {
    ;(await supabase
      .from('einloesungen')
      .update({
        genutzt: true,
      })
      .eq('id', e.id),
      await reload())
  }
  async function saveReward(t) {
    if (!user) return false
    let n = {
        titel: t.titel.trim(),
        preis: t.preis,
        emoji: t.emoji,
      },
      { error: r } = t.id
        ? await supabase.from('belohnungen').update(n).eq('id', t.id)
        : await supabase.from('belohnungen').insert({
            user_id: user.id,
            ...n,
          })
    return r ? false : (await reload(), true)
  }
  async function removeReward(e) {
    ;(await supabase.from('belohnungen').delete().eq('id', e.id), setEditTarget(null), await reload())
  }
  if (unavailable)
    return (
      <p className="card text-sm text-text-secondary">
        Die Belohnungen sind noch nicht eingerichtet. Bitte später noch einmal versuchen.
      </p>
    )
  if (!rewards)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  let vouchers = redemptions.filter((e) => !e.genutzt),
    used = redemptions.filter((e) => e.genutzt),
    ownTitles = new Set(rewards.map((e) => e.titel)),
    ideas = REWARD_IDEAS.filter((e) => !ownTitles.has(e.titel))
  return (
    <div className="space-y-5">
      <div className="card !p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
          <Coins size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold text-text-primary tabular-nums">
            {stats.punkte} <span className="text-sm font-semibold text-text-secondary">Punkte</span>
          </div>
          <p className="text-xs text-text-secondary">
            Löse sie gegen Dinge ein, die du dir wirklich wünschst. Du bekommst einen Gutschein, Kalorien werden nicht
            gezählt.
          </p>
        </div>
      </div>
      {notice && (
        <p
          role="status"
          className={cn(
            'text-sm rounded-2xl px-4 py-2.5 border',
            notice.tone === 'ok'
              ? 'text-success bg-success/10 border-success/30'
              : 'text-warning bg-warning/10 border-warning/30',
          )}
        >
          {notice.text}
        </p>
      )}
      {vouchers.length > 0 && (
        <section aria-label="Deine Gutscheine" className="space-y-2">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase flex items-center gap-1.5">
            <Ticket size={13} aria-hidden="true" /> Deine Gutscheine
          </h3>
          {vouchers.map((e, t) => (
            <div
              style={{
                '--d': t * 50,
              }}
              className={cn(
                'enter relative card !p-4 flex items-center gap-3 border-dashed border-brand/50 bg-brand/5',
                newVoucherId === e.id && 'pop-in',
              )}
              key={e.id}
            >
              <span className="text-3xl" aria-hidden="true">
                {e.emoji ?? '🎁'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-text-primary text-sm">{e.titel}</div>
                <div className="text-xs text-text-secondary">
                  Eingelöst am {formatDate(e.eingeloest_am, 'dd.MM.yyyy')}
                </div>
              </div>
              <button
                onClick={() => markUsed(e)}
                className="btn-secondary !px-3.5 !py-2 text-sm flex items-center gap-1.5 shrink-0"
                aria-label={`${e.titel} als genutzt markieren`}
              >
                <Check size={14} aria-hidden="true" /> Genutzt
              </button>
            </div>
          ))}
        </section>
      )}
      <section aria-label="Deine Belohnungen" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase flex items-center gap-1.5">
            <Gift size={13} aria-hidden="true" /> Meine Belohnungen
          </h3>
          <button
            onClick={() => setEditTarget('new')}
            className="-my-2 px-2 py-2.5 text-sm font-semibold text-brand flex items-center gap-1 hover:underline"
          >
            <Plus size={15} aria-hidden="true" /> Neu
          </button>
        </div>
        {rewards.length === 0 && (
          <p className="card text-sm text-text-secondary">
            Noch keine eigene Belohnung. Wähle unten eine Idee oder lege selbst eine an.
          </p>
        )}
        {rewards.map((e, n) => {
          let r = stats.punkte >= e.preis
          return (
            <div
              className="enter card !p-3.5 flex items-center gap-3"
              style={{
                '--d': n * 40,
              }}
              key={e.id}
            >
              <span className="text-2xl w-9 text-center" aria-hidden="true">
                {e.emoji ?? '🎁'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-text-primary text-sm">{e.titel}</div>
                {r ? (
                  <div className="text-xs font-semibold text-warning tabular-nums inline-flex items-center gap-1">
                    <Coins size={11} aria-hidden="true" /> {e.preis}
                  </div>
                ) : (
                  <div className="mt-1">
                    <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full bg-brand/70 rounded-full transition-[width] duration-700"
                        style={{
                          width: `${Math.min(100, (stats.punkte / e.preis) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-text-secondary mt-1 tabular-nums">
                      Noch {e.preis - stats.punkte} Punkte ({e.preis})
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditTarget(e)}
                aria-label={`${e.titel} bearbeiten`}
                className="w-9 h-9 rounded-full text-text-secondary hover:text-brand hover:bg-bg-elevated flex items-center justify-center transition-colors"
              >
                <Pencil size={15} aria-hidden="true" />
              </button>
              <button
                onClick={() => redeem(e)}
                disabled={!r || redeemingId === e.id}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-all active:scale-95 disabled:cursor-not-allowed',
                  r ? 'bg-primary text-white border-brand' : 'bg-bg-elevated text-text-muted border-border',
                )}
              >
                {redeemingId === e.id ? <Spinner size={14} className="text-white" /> : 'Einlösen'}
              </button>
            </div>
          )
        })}
      </section>
      {ideas.length > 0 && (
        <section aria-label="Ideen für Belohnungen" className="space-y-2">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">Ideen</h3>
          <div className="flex flex-wrap gap-2">
            {ideas.map((e) => (
              <button
                disabled={addingIdea}
                onClick={async () => {
                  addingIdea ||
                    (setAddingIdea(true),
                    await saveReward({
                      titel: e.titel,
                      preis: e.preis,
                      emoji: e.emoji,
                    }),
                    setAddingIdea(false))
                }}
                className="px-3 py-2 rounded-2xl border border-border bg-bg-elevated text-sm text-text-primary hover:border-brand/50 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60"
                aria-label={`${e.titel} für ${e.preis} Punkte hinzufügen`}
                key={e.titel}
              >
                <span aria-hidden="true">{e.emoji}</span> {e.titel}{' '}
                <span className="text-xs text-warning font-semibold tabular-nums">{e.preis}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {used.length > 0 && (
        <section aria-label="Genutzte Gutscheine" className="space-y-1.5">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">Schon genossen</h3>
          {used.slice(0, 10).map((e) => (
            <div className="flex items-center gap-3 px-1 text-sm text-text-secondary" key={e.id}>
              <span aria-hidden="true">{e.emoji ?? '🎁'}</span>
              <span className="flex-1 truncate">{e.titel}</span>
              <span className="text-xs tabular-nums">{formatDate(e.eingeloest_am, 'dd.MM.')}</span>
            </div>
          ))}
        </section>
      )}
      <RewardSheet
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={saveReward}
        onDelete={removeReward}
      />
    </div>
  )
}
export function RewardSheet({ target, onClose, onSave, onDelete }) {
  let [title, setTitle] = useState(''),
    [price, setPrice] = useState('100'),
    [emoji, setEmoji] = useState('🎁'),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(null),
    isNew = target === 'new'
  useEffect(() => {
    target &&
      (setError(null),
      setSaving(false),
      target === 'new'
        ? (setTitle(''), setPrice('100'), setEmoji('🎁'))
        : (setTitle(target.titel), setPrice(String(target.preis)), setEmoji(target.emoji)))
  }, [target])
  let priceNumber = Math.round(Number(price)),
    valid = title.trim().length >= 2 && priceNumber >= 10 && priceNumber <= 5e3
  async function save() {
    if (!valid || saving) return
    ;(setSaving(true), setError(null))
    let r = await onSave({
      id: target && target !== 'new' ? target.id : undefined,
      titel: title,
      preis: priceNumber,
      emoji,
    })
    if ((setSaving(false), !r)) {
      setError('Das hat nicht geklappt. Versuche es noch einmal.')
      return
    }
    onClose()
  }
  return (
    <BottomSheet open={!!target} onClose={onClose} title={isNew ? 'Neue Belohnung' : 'Belohnung bearbeiten'}>
      <div className="space-y-4 pb-3">
        <div>
          <label className="label" htmlFor="rw-titel">
            Was wünschst du dir?
          </label>
          <input
            id="rw-titel"
            className="input"
            maxLength={60}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Ein Stück Kuchen"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label" htmlFor="rw-preis">
            Preis in Punkten (10 bis 5000)
          </label>
          <input
            id="rw-preis"
            className="input tabular-nums"
            type="number"
            inputMode="numeric"
            min={10}
            max={5e3}
            step={5}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <div className="label">Symbol</div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Symbol">
            {REWARD_EMOJIS.map((e) => (
              <button
                type="button"
                onClick={() => setEmoji(e)}
                aria-pressed={emoji === e}
                aria-label={`Symbol ${e}`}
                className={cn(
                  'w-11 h-11 rounded-2xl border text-xl transition-all active:scale-90',
                  emoji === e ? 'border-brand bg-brand/10 scale-105' : 'border-border bg-bg-elevated',
                )}
                key={e}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          {!isNew && target && (
            <button
              onClick={() => void onDelete(target)}
              aria-label="Belohnung löschen"
              className="w-12 rounded-2xl bg-bg-elevated border border-border-input text-text-secondary hover:text-danger hover:border-danger/50 flex items-center justify-center transition-colors"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          )}
          <button
            onClick={save}
            disabled={!valid || saving}
            className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Spinner size={16} className="text-white" /> : <Check size={18} aria-hidden="true" />} Speichern
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
