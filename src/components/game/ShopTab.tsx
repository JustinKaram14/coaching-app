// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { SHOP_CATEGORY_LABELS, SHOP_CATEGORY_SLOTS, SHOP_ITEMS, shopItemState, toggleEquipped } from '../../lib/game'
import { useGame } from '../../hooks/useGame'
import { useState } from 'react'
import { Avatar } from './Avatar'
import { Check, Coins, Lock, Shirt } from 'lucide-react'
import { SegmentedTabs } from '../ui/SegmentedTabs'
import { cn } from '../../lib/utils'

export const SHOP_TABS = Object.keys(SHOP_CATEGORY_LABELS).map((categoryKey) => ({
  key: categoryKey,
  label: SHOP_CATEGORY_LABELS[categoryKey],
}))
export function ShopTab() {
  let { character, stats, level, owned, buy, equip } = useGame(),
    [category, setCategory] = useState('kleidung'),
    [notice, setNotice] = useState(null),
    [justBoughtId, setJustBoughtId] = useState(null),
    [busy, setBusy] = useState(false)
  if (!character) return null
  let items = SHOP_ITEMS.filter((shopItem) => SHOP_CATEGORY_SLOTS[category].includes(shopItem.slot)).sort(
      (itemA, itemB) => itemA.minLevel - itemB.minLevel || itemA.preis - itemB.preis,
    ),
    wornCount = Object.values(character.equipped).filter(Boolean).length
  async function purchase(shopItem) {
    if (busy) return
    ;(setBusy(true), setNotice(null))
    let errorText = await buy(shopItem)
    if (errorText) {
      ;(setBusy(false),
        setNotice({
          tone: 'warn',
          text: errorText,
        }))
      return
    }
    ;(setJustBoughtId(shopItem.id),
      window.setTimeout(() => setJustBoughtId(null), 900),
      await equip(toggleEquipped(character.equipped, shopItem)),
      setBusy(false),
      setNotice({
        tone: 'ok',
        text: `${shopItem.name} gehört jetzt dir und ist angezogen.`,
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
      <SegmentedTabs tabs={SHOP_TABS} value={category} onChange={(nextCategory) => setCategory(nextCategory)} label="Shop-Bereich" />
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
        {items.map((shopItem, index) => {
          let state = shopItemState(shopItem, owned, level.level, stats.punkte),
            isWorn = character.equipped[shopItem.slot] === shopItem.id
          return (
            <div
              style={{
                '--d': 40 + index * 50,
              }}
              className={cn(
                'enter card !p-3 flex flex-col items-center text-center gap-2',
                isWorn && 'border-brand/60 ring-1 ring-brand/30',
              )}
              key={shopItem.id}
            >
              <div
                className={cn(
                  'rounded-3xl bg-bg-elevated px-2 pt-1 transition-transform',
                  state === 'locked' && 'opacity-50 grayscale',
                  justBoughtId === shopItem.id && 'pop-in',
                )}
              >
                <Avatar
                  view="head"
                  size={96}
                  config={character.config}
                  equipped={{
                    ...character.equipped,
                    [shopItem.slot]: shopItem.id,
                  }}
                  label={`${shopItem.name} Vorschau`}
                />
              </div>
              <div>
                <div className="font-bold text-text-primary text-sm">{shopItem.name}</div>
                <div className="text-xs text-text-secondary leading-snug">{shopItem.text}</div>
              </div>
              {state === 'owned' && (
                <button
                  onClick={() => equip(toggleEquipped(character.equipped, shopItem))}
                  className={cn(
                    'w-full rounded-full py-2 text-sm font-semibold border transition-all active:scale-95',
                    isWorn
                      ? 'bg-primary text-white border-brand'
                      : 'bg-bg-elevated text-text-primary border-border-light hover:border-brand/50',
                  )}
                  aria-pressed={isWorn}
                >
                  {isWorn ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check size={14} aria-hidden="true" /> Getragen
                    </span>
                  ) : (
                    'Anziehen'
                  )}
                </button>
              )}
              {state === 'buyable' && (
                <button
                  onClick={() => purchase(shopItem)}
                  disabled={busy}
                  className="btn-primary w-full !py-2 text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <Coins size={14} aria-hidden="true" /> Kaufen · {shopItem.preis}
                </button>
              )}
              {state === 'poor' && (
                <div className="w-full">
                  <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full bg-brand/70 rounded-full"
                      style={{
                        width: `${Math.min(100, (stats.punkte / shopItem.preis) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-text-secondary mt-1.5 tabular-nums">
                    Noch {shopItem.preis - stats.punkte} Punkte ({shopItem.preis})
                  </div>
                </div>
              )}
              {state === 'locked' && (
                <div className="w-full rounded-full py-2 text-xs font-semibold bg-bg-elevated text-text-secondary flex items-center justify-center gap-1.5">
                  <Lock size={13} aria-hidden="true" /> Ab Level {shopItem.minLevel}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
