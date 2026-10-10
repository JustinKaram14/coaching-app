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
            (_item, index) => {
              let angle = (index / count) * Math.PI * 2 + (index % 3) * 0.18,
                distance = 130 + ((index * 53) % 140)
              return {
                dx: Math.cos(angle) * distance,
                dy: Math.sin(angle) * distance - 60,
                rot: ((index * 97) % 720) - 360,
                color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                w: (index % 6) * 0.04,
                t: 1.3 + ((index * 7) % 8) / 10,
                shape: index % 3 == 0 ? 'rounded-full' : 'rounded-[2px]',
                size: 6 + (index % 4) * 2,
              }
            },
          ),
        [count],
      ).map((piece, index) => (
        <span
          className={`confetti absolute block ${piece.shape}`}
          style={{
            width: piece.size,
            height: piece.size * (piece.shape === 'rounded-full' ? 1 : 1.7),
            backgroundColor: piece.color,
            '--dx': `${piece.dx}px`,
            '--dy': `${piece.dy}px`,
            '--rot': `${piece.rot}deg`,
            '--w': `${piece.w}s`,
            '--t': `${piece.t}s`,
          }}
          key={index}
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
      let firstCheer = window.setTimeout(() => {
          avatarRef.current?.cheer()
        }, 450),
        secondCheer = window.setTimeout(() => {
          avatarRef.current?.cheer()
        }, 2300)
      continueRef.current?.focus()
      let onKeyDown = (event) => {
        event.key === 'Escape' && dismissLevelUp()
      }
      return (
        document.addEventListener('keydown', onKeyDown),
        () => {
          ;(window.clearTimeout(firstCheer), window.clearTimeout(secondCheer), document.removeEventListener('keydown', onKeyDown))
        }
      )
    }, [levelUp, dismissLevelUp]),
    !available || !character)
  )
    return null
  let unlocked = levelUp ? SHOP_ITEMS.filter((item) => item.minLevel === levelUp) : []
  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            className="toast-pop flex items-center gap-3 rounded-full bg-bg-card border border-brand/40 shadow-glow pl-2 pr-4 py-2 max-w-full"
            key={toast.id}
          >
            <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
              <Star size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-text-primary tabular-nums">
                +{toast.xp} XP{toast.punkte > 0 && <span className="text-warning"> · +{toast.punkte} Punkte</span>}
              </span>
              <span className="block text-xs text-text-secondary truncate">
                {toast.titel.length > 2 ? `${toast.titel.slice(0, 2).join(', ')} und mehr` : toast.titel.join(', ')}
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
            onClick={(event) => {
              event.target === event.currentTarget && dismissLevelUp()
            }}
          >
            <div
              className="min-h-full flex items-center justify-center p-5 py-[max(1.25rem,env(safe-area-inset-top))]"
              onClick={(event) => {
                event.target === event.currentTarget && dismissLevelUp()
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
                        {unlocked.map((item) => (
                          <li className="flex items-center justify-between gap-2 text-sm" key={item.id}>
                            <span className="font-semibold text-text-primary">{item.name}</span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning tabular-nums">
                              <Coins size={12} aria-hidden="true" /> {item.preis}
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
