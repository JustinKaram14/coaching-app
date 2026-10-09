// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { DEFAULT_CHARACTER } from '../lib/game'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Droplets, Minus, Plus, Undo2 } from 'lucide-react'
import { Avatar } from './game/Avatar'
import { cn } from '../lib/utils'

export const BOTTLE_SIZES = [330, 500, 750, 1e3]
export const QUICK_ADD_ML = [250, 500, 750]
export const formatLiters = (e) =>
  (e / 1e3).toLocaleString('de-DE', {
    maximumFractionDigits: 2,
  })
export function waterMessage(e, t) {
  return e >= 100
    ? 'Tagesziel geschafft, stark!'
    : e === 0
      ? 'Los geht’s: Die erste Flasche wartet.'
      : e < 50
        ? `Guter Start! Noch ${formatLiters(t)} l.`
        : e === 50
          ? `Halbzeit! Noch ${formatLiters(t)} l.`
          : `Über die Hälfte, weiter so! Noch ${formatLiters(t)} l.`
}
export function WaterTracker({
  totalMl,
  goalMl,
  entries,
  bottleMl,
  onBottleChange,
  onAdd,
  onRemoveLast,
  avatar = DEFAULT_CHARACTER,
  equipped,
}) {
  let avatarRef = useRef(null),
    [shownMl, setShownMl] = useState(0),
    [drinking, setDrinking] = useState(0),
    [customOpen, setCustomOpen] = useState(false),
    totalRef = useRef(totalMl)
  ;((totalRef.current = totalMl),
    useEffect(() => {
      let e = requestAnimationFrame(() => setShownMl(totalRef.current))
      return () => cancelAnimationFrame(e)
    }, []),
    useEffect(() => {
      drinking === 0 && setShownMl(totalMl)
    }, [totalMl, drinking]))
  let drink = useCallback(
      async (e) => {
        ;(onAdd(e), setDrinking((e) => e + 1))
        let n = totalRef.current >= goalMl
        try {
          ;(await avatarRef.current?.drink(e, bottleMl, {
            onSip: () => setShownMl((t) => t + e),
          }),
            !n && totalRef.current + e >= goalMl && (await avatarRef.current?.cheer()))
        } finally {
          ;(setDrinking((e) => e - 1), setShownMl(totalRef.current))
        }
      },
      [bottleMl, goalMl, onAdd],
    ),
    shownPct = Math.min(100, Math.round((shownMl / Math.max(goalMl, 1)) * 100)),
    pct = Math.min(100, Math.round((totalMl / Math.max(goalMl, 1)) * 100)),
    remainingMl = Math.max(0, goalMl - totalMl)
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets size={16} className="text-info" aria-hidden="true" />
          <h3 className="font-semibold text-text-primary text-sm">Wasser</h3>
        </div>
        <span className="text-xs text-text-secondary tabular-nums">
          {formatLiters(totalMl)} / {formatLiters(goalMl)} l
        </span>
      </div>
      <div className="max-w-md mx-auto w-full space-y-4">
        <div className="flex items-end justify-center gap-3">
          <Avatar
            ref={avatarRef}
            config={avatar}
            equipped={equipped}
            holdBottle
            bottleMl={bottleMl}
            size={176}
            label="Deine Figur trinkt aus der Flasche"
          />
          <div className="flex flex-col items-center gap-1.5 pb-1">
            <div
              role="img"
              aria-label={`${formatLiters(totalMl)} von ${formatLiters(goalMl)} Litern getrunken, ${pct} Prozent`}
              className="relative w-[96px] h-[184px] rounded-[30px] border-2 border-info/50 bg-bg-elevated overflow-hidden"
            >
              <div
                className="absolute inset-x-0 bottom-0 h-full"
                style={{
                  transform: `translate3d(0, ${100 - shownPct}%, 0)`,
                  transition: 'transform 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  willChange: 'transform',
                }}
              >
                <div className="water-wave absolute -top-3 left-0 w-[200%] h-4 text-info/80" aria-hidden="true">
                  <svg viewBox="0 0 200 16" preserveAspectRatio="none" className="w-full h-full" fill="currentColor">
                    <path d="M0 8 C 12 0, 38 0, 50 8 S 88 16, 100 8 C 112 0, 138 0, 150 8 S 188 16, 200 8 V16 H0 Z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-info/80" />
                {drinking > 0 &&
                  [0, 1, 2].map((e) => (
                    <span
                      className="water-bubble absolute bottom-2 w-1.5 h-1.5 rounded-full bg-white/70"
                      style={{
                        left: `${22 + e * 26}%`,
                        animationDelay: `${e * 380}ms`,
                      }}
                      key={e}
                    />
                  ))}
              </div>
              <div className="absolute left-0 inset-y-0 w-2.5 pointer-events-none" aria-hidden="true">
                {Array.from({
                  length: Math.max(0, Math.floor(goalMl / 500) - 1),
                }).map((e, t, n) => (
                  <span
                    className="absolute left-0 h-0.5 w-2.5 rounded-r bg-text-muted/70"
                    style={{
                      top: `${((t + 1) / (n.length + 1)) * 100}%`,
                    }}
                    key={t}
                  />
                ))}
              </div>
            </div>
            <span className="text-lg font-bold text-text-primary tabular-nums leading-none">{shownPct}%</span>
          </div>
        </div>
        <p className="text-sm text-text-secondary text-center" aria-live="polite">
          {waterMessage(pct, remainingMl)}
        </p>
        <button
          onClick={() => drink(bottleMl)}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          <Droplets size={18} aria-hidden="true" /> Flasche getrunken · {bottleMl} ml
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_ADD_ML.map((e) => (
            <button
              onClick={() => drink(e)}
              className="btn-secondary !px-4 !py-1.5 text-sm flex items-center gap-1"
              key={e}
            >
              <Plus size={13} aria-hidden="true" /> {e} ml
            </button>
          ))}
          {entries > 0 && (
            <button
              onClick={onRemoveLast}
              className="ml-auto text-xs text-text-muted hover:text-danger transition-colors flex items-center gap-1 px-2.5 py-2.5 rounded-lg"
              aria-label="Letzten Eintrag rückgängig machen"
            >
              <Undo2 size={13} aria-hidden="true" /> Rückgängig
            </button>
          )}
        </div>
        <div className="border-t border-border pt-3">
          <div className="text-xs font-semibold text-text-secondary mb-2">Meine Flasche</div>
          <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Flaschengröße">
            {BOTTLE_SIZES.map((e) => (
              <button
                aria-pressed={bottleMl === e && !customOpen}
                onClick={() => {
                  ;(setCustomOpen(false), onBottleChange(e))
                }}
                className={cn(
                  'px-3.5 py-2.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                  bottleMl === e && !customOpen
                    ? 'bg-primary border-brand text-white'
                    : 'border-border text-text-secondary hover:border-brand/40',
                )}
                key={e}
              >
                {e >= 1e3 ? `${e / 1e3} l` : `${e} ml`}
              </button>
            ))}
            <button
              aria-pressed={customOpen || !BOTTLE_SIZES.includes(bottleMl)}
              onClick={() => setCustomOpen(true)}
              className={cn(
                'px-3.5 py-2.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                customOpen || !BOTTLE_SIZES.includes(bottleMl)
                  ? 'bg-primary border-brand text-white'
                  : 'border-border text-text-secondary hover:border-brand/40',
              )}
            >
              Andere
            </button>
          </div>
          {(customOpen || !BOTTLE_SIZES.includes(bottleMl)) && (
            <div className="flex items-center gap-2 mt-2">
              <button
                className="p-2 rounded-xl bg-bg-elevated border border-border text-text-secondary"
                aria-label="50 ml weniger"
                onClick={() => onBottleChange(Math.max(100, bottleMl - 50))}
              >
                <Minus size={14} />
              </button>
              <label className="sr-only" htmlFor="bottle-ml">
                Flaschengröße in Millilitern
              </label>
              <input
                id="bottle-ml"
                type="number"
                inputMode="numeric"
                min={100}
                max={2e3}
                step={50}
                className="input !w-28 !py-2 text-center"
                value={bottleMl}
                onChange={(e) => {
                  let t = parseInt(e.target.value)
                  t >= 100 && t <= 2e3 && onBottleChange(t)
                }}
              />
              <span className="text-sm text-text-secondary">ml</span>
              <button
                className="p-2 rounded-xl bg-bg-elevated border border-border text-text-secondary"
                aria-label="50 ml mehr"
                onClick={() => onBottleChange(Math.min(2e3, bottleMl + 50))}
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
