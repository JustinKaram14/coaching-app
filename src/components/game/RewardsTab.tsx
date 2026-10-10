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
      let [rewardsResult, redemptionsResult] = await Promise.all([
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
      if (rewardsResult.error) {
        setUnavailable(true)
        return
      }
      ;(setUnavailable(false),
        setRewards(rewardsResult.data ?? []),
        setRedemptions((redemptionsResult.error ? [] : redemptionsResult.data) ?? []))
    }, [user])
  useEffect(() => {
    reload()
  }, [reload])
  async function redeem(reward) {
    if (!user || redeemingId) return
    ;(setRedeemingId(reward.id), setNotice(null))
    let result = await redeemReward(reward)
    if (result.error) {
      ;(setRedeemingId(null),
        setNotice({
          tone: 'warn',
          text: result.error,
        }))
      return
    }
    let voucherId = result.id
    ;(setRedeemingId(null),
      setNewVoucherId(voucherId),
      window.setTimeout(() => setNewVoucherId(null), 1200),
      setNotice({
        tone: 'ok',
        text: `„${reward.titel}“ ist jetzt dein Gutschein. Genieß es!`,
      }),
      await reload())
  }
  async function markUsed(voucher) {
    ;(await supabase
      .from('einloesungen')
      .update({
        genutzt: true,
      })
      .eq('id', voucher.id),
      await reload())
  }
  async function saveReward(reward) {
    if (!user) return false
    let fields = {
        titel: reward.titel.trim(),
        preis: reward.preis,
        emoji: reward.emoji,
      },
      { error } = reward.id
        ? await supabase.from('belohnungen').update(fields).eq('id', reward.id)
        : await supabase.from('belohnungen').insert({
            user_id: user.id,
            ...fields,
          })
    return error ? false : (await reload(), true)
  }
  async function removeReward(reward) {
    ;(await supabase.from('belohnungen').delete().eq('id', reward.id), setEditTarget(null), await reload())
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
  let vouchers = redemptions.filter((redemption) => !redemption.genutzt),
    used = redemptions.filter((redemption) => redemption.genutzt),
    ownTitles = new Set(rewards.map((reward) => reward.titel)),
    ideas = REWARD_IDEAS.filter((idea) => !ownTitles.has(idea.titel))
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
          {vouchers.map((voucher, index) => (
            <div
              style={{
                '--d': index * 50,
              }}
              className={cn(
                'enter relative card !p-4 flex items-center gap-3 border-dashed border-brand/50 bg-brand/5',
                newVoucherId === voucher.id && 'pop-in',
              )}
              key={voucher.id}
            >
              <span className="text-3xl" aria-hidden="true">
                {voucher.emoji ?? '🎁'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-text-primary text-sm">{voucher.titel}</div>
                <div className="text-xs text-text-secondary">
                  Eingelöst am {formatDate(voucher.eingeloest_am, 'dd.MM.yyyy')}
                </div>
              </div>
              <button
                onClick={() => markUsed(voucher)}
                className="btn-secondary !px-3.5 !py-2 text-sm flex items-center gap-1.5 shrink-0"
                aria-label={`${voucher.titel} als genutzt markieren`}
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
        {rewards.map((reward, index) => {
          let affordable = stats.punkte >= reward.preis
          return (
            <div
              className="enter card !p-3.5 flex items-center gap-3"
              style={{
                '--d': index * 40,
              }}
              key={reward.id}
            >
              <span className="text-2xl w-9 text-center" aria-hidden="true">
                {reward.emoji ?? '🎁'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-text-primary text-sm">{reward.titel}</div>
                {affordable ? (
                  <div className="text-xs font-semibold text-warning tabular-nums inline-flex items-center gap-1">
                    <Coins size={11} aria-hidden="true" /> {reward.preis}
                  </div>
                ) : (
                  <div className="mt-1">
                    <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full bg-brand/70 rounded-full transition-[width] duration-700"
                        style={{
                          width: `${Math.min(100, (stats.punkte / reward.preis) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-text-secondary mt-1 tabular-nums">
                      Noch {reward.preis - stats.punkte} Punkte ({reward.preis})
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditTarget(reward)}
                aria-label={`${reward.titel} bearbeiten`}
                className="w-9 h-9 rounded-full text-text-secondary hover:text-brand hover:bg-bg-elevated flex items-center justify-center transition-colors"
              >
                <Pencil size={15} aria-hidden="true" />
              </button>
              <button
                onClick={() => redeem(reward)}
                disabled={!affordable || redeemingId === reward.id}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-all active:scale-95 disabled:cursor-not-allowed',
                  affordable ? 'bg-primary text-white border-brand' : 'bg-bg-elevated text-text-muted border-border',
                )}
              >
                {redeemingId === reward.id ? <Spinner size={14} className="text-white" /> : 'Einlösen'}
              </button>
            </div>
          )
        })}
      </section>
      {ideas.length > 0 && (
        <section aria-label="Ideen für Belohnungen" className="space-y-2">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">Ideen</h3>
          <div className="flex flex-wrap gap-2">
            {ideas.map((idea) => (
              <button
                disabled={addingIdea}
                onClick={async () => {
                  addingIdea ||
                    (setAddingIdea(true),
                    await saveReward({
                      titel: idea.titel,
                      preis: idea.preis,
                      emoji: idea.emoji,
                    }),
                    setAddingIdea(false))
                }}
                className="px-3 py-2 rounded-2xl border border-border bg-bg-elevated text-sm text-text-primary hover:border-brand/50 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60"
                aria-label={`${idea.titel} für ${idea.preis} Punkte hinzufügen`}
                key={idea.titel}
              >
                <span aria-hidden="true">{idea.emoji}</span> {idea.titel}{' '}
                <span className="text-xs text-warning font-semibold tabular-nums">{idea.preis}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {used.length > 0 && (
        <section aria-label="Genutzte Gutscheine" className="space-y-1.5">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">Schon genossen</h3>
          {used.slice(0, 10).map((voucher) => (
            <div className="flex items-center gap-3 px-1 text-sm text-text-secondary" key={voucher.id}>
              <span aria-hidden="true">{voucher.emoji ?? '🎁'}</span>
              <span className="flex-1 truncate">{voucher.titel}</span>
              <span className="text-xs tabular-nums">{formatDate(voucher.eingeloest_am, 'dd.MM.')}</span>
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
    let saved = await onSave({
      id: target && target !== 'new' ? target.id : undefined,
      titel: title,
      preis: priceNumber,
      emoji,
    })
    if ((setSaving(false), !saved)) {
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
            onChange={(event) => setTitle(event.target.value)}
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
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
        <div>
          <div className="label">Symbol</div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Symbol">
            {REWARD_EMOJIS.map((symbol) => (
              <button
                type="button"
                onClick={() => setEmoji(symbol)}
                aria-pressed={emoji === symbol}
                aria-label={`Symbol ${symbol}`}
                className={cn(
                  'w-11 h-11 rounded-2xl border text-xl transition-all active:scale-90',
                  emoji === symbol ? 'border-brand bg-brand/10 scale-105' : 'border-border bg-bg-elevated',
                )}
                key={symbol}
              >
                {symbol}
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
