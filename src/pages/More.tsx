import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { clientNav, coachNav, clientTabs, coachTabs, moreItems } from '../lib/navigation'

export function More() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isCoach = profile?.role === 'coach'
  const items = isCoach ? moreItems(coachNav, coachTabs) : moreItems(clientNav, clientTabs)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand/15 flex items-center justify-center text-brand text-xl font-bold shrink-0">
          {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <h1 className="section-title text-2xl truncate">{profile?.name ?? 'Mehr'}</h1>
          <p className="text-sm text-text-secondary truncate">{profile?.email}</p>
        </div>
      </div>

      <nav className="card !p-2" aria-label="Weitere Seiten">
        <ul>
          {items.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-4 px-3 py-3.5 rounded-2xl hover:bg-bg-elevated transition-colors"
              >
                <span className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="flex-1 text-sm font-semibold text-text-primary">{label}</span>
                <ChevronRight size={18} className="text-text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="card !p-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 px-3 py-3.5 rounded-2xl hover:bg-danger/10 transition-colors text-left"
        >
          <span className="w-10 h-10 rounded-2xl bg-danger/10 text-danger flex items-center justify-center shrink-0">
            <LogOut size={20} aria-hidden="true" />
          </span>
          <span className="flex-1 text-sm font-semibold text-danger">Abmelden</span>
        </button>
      </div>

      <div className="flex gap-4 px-2">
        <Link to="/legal" className="text-xs text-text-muted hover:text-text-secondary underline underline-offset-2">Impressum</Link>
        <Link to="/legal" className="text-xs text-text-muted hover:text-text-secondary underline underline-offset-2">Datenschutz</Link>
      </div>
    </div>
  )
}
