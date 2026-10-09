// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useEffect, useMemo, useRef } from 'react'
import { useGame } from '../../hooks/useGame'
import { DEFAULT_CHARACTER, SHOP_ITEMS, levelTitle } from '../../lib/game'
import { Coins, Sparkles, Star } from 'lucide-react'
import { Avatar } from './Avatar'
import { Link } from 'react-router-dom'

export const CONFETTI_COLORS = [
  'rgb(var(--c-brand))',
  'rgb(var(--c-warning))',
  'rgb(var(--c-accent))',
  'rgb(var(--c-info))',
  'rgb(var(--c-success))',
]
export function Confetti({ count = 44 }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[38%] w-0 h-0" aria-hidden="true">
      {useMemo(
        () =>
          Array.from(
            {
              length: count,
            },
            (t, n) => {
              let r = (n / count) * Math.PI * 2 + (n % 3) * 0.18,
                i = 130 + ((n * 53) % 140)
              return {
                dx: Math.cos(r) * i,
                dy: Math.sin(r) * i - 60,
                rot: ((n * 97) % 720) - 360,
                color: CONFETTI_COLORS[n % CONFETTI_COLORS.length],
                w: (n % 6) * 0.04,
                t: 1.3 + ((n * 7) % 8) / 10,
                shape: n % 3 == 0 ? 'rounded-full' : 'rounded-[2px]',
                size: 6 + (n % 4) * 2,
              }
            },
          ),
        [count],
      ).map((e, t) => (
        <span
          className={`confetti absolute block ${e.shape}`}
          style={{
            width: e.size,
            height: e.size * (e.shape === 'rounded-full' ? 1 : 1.7),
            backgroundColor: e.color,
            '--dx': `${e.dx}px`,
            '--dy': `${e.dy}px`,
            '--rot': `${e.rot}deg`,
            '--w': `${e.w}s`,
            '--t': `${e.t}s`,
          }}
          key={t}
        />
      ))}
    </div>
  )
}
export function GameOverlay() {
  let { toasts, levelUp, dismissLevelUp, character, available } = useGame(),
    avatarRef = useRef(null),
    continueRef = useRef(null),
    smallScreen = typeof window < 'u' && window.innerHeight < 700
  if (
    (useEffect(() => {
      if (!levelUp) return
      try {
        navigator.vibrate?.([40, 60, 40, 60, 90])
      } catch {}
      let e = window.setTimeout(() => {
          avatarRef.current?.cheer()
        }, 450),
        r = window.setTimeout(() => {
          avatarRef.current?.cheer()
        }, 2300)
      continueRef.current?.focus()
      let i = (e) => {
        e.key === 'Escape' && dismissLevelUp()
      }
      return (
        document.addEventListener('keydown', i),
        () => {
          ;(window.clearTimeout(e), window.clearTimeout(r), document.removeEventListener('keydown', i))
        }
      )
    }, [levelUp, dismissLevelUp]),
    !available || !character)
  )
    return null
  let unlocked = levelUp ? SHOP_ITEMS.filter((e) => e.minLevel === levelUp) : []
  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
        role="status"
        aria-live="polite"
      >
        {toasts.map((e) => (
          <div
            className="toast-pop flex items-center gap-3 rounded-full bg-bg-card border border-brand/40 shadow-glow pl-2 pr-4 py-2 max-w-full"
            key={e.id}
          >
            <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
              <Star size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-text-primary tabular-nums">
                +{e.xp} XP{e.punkte > 0 && <span className="text-warning"> · +{e.punkte} Punkte</span>}
              </span>
              <span className="block text-xs text-text-secondary truncate">
                {e.titel.length > 2 ? `${e.titel.slice(0, 2).join(', ')} und mehr` : e.titel.join(', ')}
              </span>
            </span>
          </div>
        ))}
      </div>
      {levelUp && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Level ${levelUp} erreicht`}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm fade-in" onClick={dismissLevelUp} />
          <div
            className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain"
            onClick={(e) => {
              e.target === e.currentTarget && dismissLevelUp()
            }}
          >
            <div
              className="min-h-full flex items-center justify-center p-5 py-[max(1.25rem,env(safe-area-inset-top))]"
              onClick={(e) => {
                e.target === e.currentTarget && dismissLevelUp()
              }}
            >
              <div className="relative w-full max-w-sm modal-in text-center">
                <div
                  className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] max-w-[130vw] pointer-events-none"
                  aria-hidden="true"
                >
                  <div
                    className="rays w-full h-full rounded-full opacity-30"
                    style={{
                      background:
                        'repeating-conic-gradient(from 0deg, rgb(var(--c-warning)) 0deg 9deg, transparent 9deg 24deg)',
                      WebkitMaskImage: 'radial-gradient(circle, #000 12%, transparent 68%)',
                      maskImage: 'radial-gradient(circle, #000 12%, transparent 68%)',
                    }}
                  />
                </div>
                <Confetti />
                <div className="relative flex flex-col items-center">
                  <div className="level-pop text-xs font-extrabold tracking-[0.3em] text-warning uppercase mb-1">
                    Level-up
                  </div>
                  <div className="relative">
                    <Avatar
                      ref={avatarRef}
                      config={character.config ?? DEFAULT_CHARACTER}
                      equipped={character.equipped}
                      size={smallScreen ? 140 : 190}
                      idle
                      label={`${character.name} jubelt`}
                    />
                    <span className="level-pop absolute -bottom-2 left-1/2 -translate-x-1/2 min-w-[84px] px-4 py-1.5 rounded-full bg-primary text-white text-2xl font-extrabold tabular-nums ring-4 ring-bg-card border border-brand/50 shadow-glow">
                      {levelUp}
                    </span>
                  </div>
                  <h2
                    className="enter mt-6 text-2xl font-extrabold text-text-primary"
                    style={{
                      '--d': 420,
                    }}
                  >
                    {character.name} ist jetzt {levelTitle(levelUp)}!
                  </h2>
                  <p
                    className="enter text-sm text-text-secondary mt-1"
                    style={{
                      '--d': 520,
                    }}
                  >
                    Du hast Level {levelUp} erreicht. Stark, dass du so dranbleibst.
                  </p>
                  {unlocked.length > 0 && (
                    <div
                      className="enter mt-4 w-full rounded-3xl bg-bg-card/90 border border-border p-3 text-left"
                      style={{
                        '--d': 640,
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-text-secondary uppercase mb-2">
                        <Sparkles size={13} className="text-warning" aria-hidden="true" /> Neu im Shop
                      </div>
                      <ul className="space-y-1">
                        {unlocked.map((e) => (
                          <li className="flex items-center justify-between gap-2 text-sm" key={e.id}>
                            <span className="font-semibold text-text-primary">{e.name}</span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning tabular-nums">
                              <Coins size={12} aria-hidden="true" /> {e.preis}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div
                    className="enter mt-5 w-full flex flex-col gap-2"
                    style={{
                      '--d': 760,
                    }}
                  >
                    <button ref={continueRef} onClick={dismissLevelUp} className="btn-primary w-full">
                      Weiter
                    </button>
                    {unlocked.length > 0 && (
                      <Link
                        to="/charakter?tab=shop"
                        onClick={dismissLevelUp}
                        className="btn-secondary w-full text-center"
                      >
                        Zum Shop
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
