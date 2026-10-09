// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { SHOP_CATEGORY_LABELS, SHOP_CATEGORY_SLOTS, SHOP_ITEMS, shopItemState, toggleEquipped } from '../../lib/game'
import { useGame } from '../../hooks/useGame'
import { useState } from 'react'
import { Avatar } from './Avatar'
import { Check, Coins, Lock, Shirt } from 'lucide-react'
import { SegmentedTabs } from '../ui/SegmentedTabs'
import { cn } from '../../lib/utils'

export const SHOP_TABS = Object.keys(SHOP_CATEGORY_LABELS).map((e) => ({
  key: e,
  label: SHOP_CATEGORY_LABELS[e],
}))
export function ShopTab() {
  let { character, stats, level, owned, buy, equip } = useGame(),
    [category, setCategory] = useState('kleidung'),
    [notice, setNotice] = useState(null),
    [justBoughtId, setJustBoughtId] = useState(null),
    [busy, setBusy] = useState(false)
  if (!character) return null
  let items = SHOP_ITEMS.filter((e) => SHOP_CATEGORY_SLOTS[category].includes(e.slot)).sort(
      (e, t) => e.minLevel - t.minLevel || e.preis - t.preis,
    ),
    wornCount = Object.values(character.equipped).filter(Boolean).length
  async function purchase(t) {
    if (busy) return
    ;(setBusy(true), setNotice(null))
    let n = await buy(t)
    if (n) {
      ;(setBusy(false),
        setNotice({
          tone: 'warn',
          text: n,
        }))
      return
    }
    ;(setJustBoughtId(t.id),
      window.setTimeout(() => setJustBoughtId(null), 900),
      await equip(toggleEquipped(character.equipped, t)),
      setBusy(false),
      setNotice({
        tone: 'ok',
        text: `${t.name} gehört jetzt dir und ist angezogen.`,
      }))
  }
  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4 !p-4 max-[359px]:flex-col max-[359px]:text-center">
        <div className="shrink-0 rounded-3xl bg-brand/10 px-2 pt-1">
          <Avatar
            config={character.config}
            equipped={character.equipped}
            size={92}
            view="head"
            label="So siehst du aus"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center max-[359px]:justify-center gap-1.5 text-lg font-extrabold text-text-primary tabular-nums">
            <Coins size={18} className="text-warning" aria-hidden="true" /> {stats.punkte}{' '}
            <span className="text-sm font-semibold text-text-secondary">Punkte</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Level {level.level}. Neue Dinge schalten mit dem Level frei, bezahlt wird mit Punkten.
          </p>
          {wornCount > 0 && (
            <button
              onClick={() => equip({})}
              className="mt-1 -mb-2 py-2.5 pr-3 text-xs font-semibold text-brand flex items-center gap-1 hover:underline max-[359px]:mx-auto"
            >
              <Shirt size={13} aria-hidden="true" /> Alles ausziehen
            </button>
          )}
        </div>
      </div>
      <SegmentedTabs tabs={SHOP_TABS} value={category} onChange={(e) => setCategory(e)} label="Shop-Bereich" />
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
      <div className="grid grid-cols-2 gap-3" key={category}>
        {items.map((i, o) => {
          let s = shopItemState(i, owned, level.level, stats.punkte),
            c = character.equipped[i.slot] === i.id
          return (
            <div
              style={{
                '--d': 40 + o * 50,
              }}
              className={cn(
                'enter card !p-3 flex flex-col items-center text-center gap-2',
                c && 'border-brand/60 ring-1 ring-brand/30',
              )}
              key={i.id}
            >
              <div
                className={cn(
                  'rounded-3xl bg-bg-elevated px-2 pt-1 transition-transform',
                  s === 'locked' && 'opacity-50 grayscale',
                  justBoughtId === i.id && 'pop-in',
                )}
              >
                <Avatar
                  view="head"
                  size={96}
                  config={character.config}
                  equipped={{
                    ...character.equipped,
                    [i.slot]: i.id,
                  }}
                  label={`${i.name} Vorschau`}
                />
              </div>
              <div>
                <div className="font-bold text-text-primary text-sm">{i.name}</div>
                <div className="text-xs text-text-secondary leading-snug">{i.text}</div>
              </div>
              {s === 'owned' && (
                <button
                  onClick={() => equip(toggleEquipped(character.equipped, i))}
                  className={cn(
                    'w-full rounded-full py-2 text-sm font-semibold border transition-all active:scale-95',
                    c
                      ? 'bg-primary text-white border-brand'
                      : 'bg-bg-elevated text-text-primary border-border-light hover:border-brand/50',
                  )}
                  aria-pressed={c}
                >
                  {c ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check size={14} aria-hidden="true" /> Getragen
                    </span>
                  ) : (
                    'Anziehen'
                  )}
                </button>
              )}
              {s === 'buyable' && (
                <button
                  onClick={() => purchase(i)}
                  disabled={busy}
                  className="btn-primary w-full !py-2 text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <Coins size={14} aria-hidden="true" /> Kaufen · {i.preis}
                </button>
              )}
              {s === 'poor' && (
                <div className="w-full">
                  <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full bg-brand/70 rounded-full"
                      style={{
                        width: `${Math.min(100, (stats.punkte / i.preis) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-text-secondary mt-1.5 tabular-nums">
                    Noch {i.preis - stats.punkte} Punkte ({i.preis})
                  </div>
                </div>
              )}
              {s === 'locked' && (
                <div className="w-full rounded-full py-2 text-xs font-semibold bg-bg-elevated text-text-secondary flex items-center justify-center gap-1.5">
                  <Lock size={13} aria-hidden="true" /> Ab Level {i.minLevel}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
