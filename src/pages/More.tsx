// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useAuth } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { clientNav, clientTabs, coachNav, coachTabs, moreItems } from '../lib/navigation'
import { STATUS_BY_ROUTE, statusText, useDayStatus } from '../hooks/useDayStatus'
import { useGame } from '../hooks/useGame'
import { Avatar } from '../components/game/Avatar'
import { cn } from '../lib/utils'
import { Check, ChevronRight, LogOut } from 'lucide-react'

export function More() {
  let { profile, signOut } = useAuth(),
    navigate = useNavigate(),
    isCoach = profile?.role === 'coach',
    items = isCoach ? moreItems(coachNav, coachTabs) : moreItems(clientNav, clientTabs),
    { status, loaded: statusLoaded } = useDayStatus(),
    { available: gameAvailable, character, level } = useGame()
  async function logout() {
    ;(await signOut(), navigate('/login'))
  }
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        {!character && (
          <div className="w-14 h-14 rounded-full bg-brand/15 flex items-center justify-center text-brand text-xl font-bold shrink-0">
            {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="section-title text-2xl truncate">{profile?.name ?? 'Mehr'}</h1>
          <p className="text-sm text-text-secondary truncate">{profile?.email}</p>
        </div>
        {!isCoach && gameAvailable && (
          <Link
            to="/charakter"
            className="relative shrink-0 transition-transform active:scale-95"
            aria-label={character ? `${character.name}, Level ${level.level}. Zur Figur` : 'Figur erstellen'}
          >
            {character ? (
              <>
                <span className="block rounded-3xl bg-brand/10 border border-brand/20 px-1 pt-0.5">
                  <Avatar view="head" config={character.config} equipped={character.equipped} size={72} idle label="" />
                </span>
                <span className="pop-in absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-primary text-white text-[11px] font-extrabold ring-2 ring-bg border border-brand/40 tabular-nums">
                  Level {level.level}
                </span>
              </>
            ) : (
              <span className="w-[72px] h-[72px] rounded-3xl border-2 border-dashed border-brand/50 text-brand flex flex-col items-center justify-center text-[11px] font-bold leading-tight text-center">
                <span className="text-xl leading-none" aria-hidden="true">
                  ＋
                </span>
                Figur
              </span>
            )}
          </Link>
        )}
      </div>
      <nav className="card !p-2" aria-label="Weitere Seiten">
        <ul>
          {items.map(({ to: route, icon: T_, label: itemLabel }) => {
            let statusKey = !isCoach && statusLoaded ? STATUS_BY_ROUTE[route] : undefined,
              dayItem = statusKey ? status[statusKey] : undefined,
              isDone = dayItem?.level === 'done',
              isPartial = dayItem?.level === 'partial',
              hasTasks = !!dayItem && dayItem.total > 0
            return (
              <li key={route}>
                <Link
                  to={route}
                  aria-label={statusKey && dayItem ? `${itemLabel}, ${statusText(statusKey, dayItem)}` : undefined}
                  className="flex items-center gap-4 px-3 py-3.5 rounded-2xl hover:bg-bg-elevated transition-colors"
                >
                  <span
                    className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-500',
                      isDone || isPartial ? 'bg-success/15 text-success' : 'bg-brand/10 text-brand',
                    )}
                  >
                    <T_ size={20} aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-text-primary">{itemLabel}</span>
                  {hasTasks && (
                    <span
                      className={cn(
                        'pop-in inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                        isDone
                          ? 'bg-success/15 text-success'
                          : isPartial
                            ? 'bg-success/10 text-success'
                            : 'bg-bg-elevated text-text-muted',
                      )}
                      key={dayItem.level}
                    >
                      {isDone && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                      {isDone ? 'Heute erledigt' : isPartial ? `${dayItem.done} von ${dayItem.total}` : 'Heute offen'}
                    </span>
                  )}
                  <ChevronRight size={18} className="text-text-muted" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="card !p-2">
        <button
          onClick={logout}
          className="w-full flex items-center gap-4 px-3 py-3.5 rounded-2xl hover:bg-danger/10 transition-colors text-left"
        >
          <span className="w-10 h-10 rounded-2xl bg-danger/10 text-danger flex items-center justify-center shrink-0">
            <LogOut size={20} aria-hidden="true" />
          </span>
          <span className="flex-1 text-sm font-semibold text-danger">Abmelden</span>
        </button>
      </div>
      <div className="flex gap-4 px-2">
        <Link
          to="/legal"
          className="hit text-xs text-text-muted hover:text-text-secondary underline underline-offset-2"
        >
          Impressum
        </Link>
        <Link
          to="/legal"
          className="hit text-xs text-text-muted hover:text-text-secondary underline underline-offset-2"
        >
          Datenschutz
        </Link>
      </div>
    </div>
  )
}
